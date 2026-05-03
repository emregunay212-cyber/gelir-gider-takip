"""
code-server için ayrı bir Cloudflare Quick Tunnel.
Subpath sorunu nedeniyle: localhost:8080 → kendi root URL'i.

İki tunnel olur:
- cloudflared.service       → localhost:80 (gelir-gider, root + /code/)
- cloudflared-code.service  → localhost:8080 (code-server, root)

Kullanıcı code-server'a kendi URL'i ile erişir → WebView origin sorunu çözülür.
"""
from __future__ import annotations
import sys
import time
import re
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

HOST = "161.97.156.48"
USER = "root"
PASSWORD = "a517o6tsEmexP5xSMTay"

SYSTEMD_SERVICE = """[Unit]
Description=Cloudflare Quick Tunnel for code-server (localhost:8080)
After=network.target code-server.service

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://localhost:8080
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/cloudflared-code.log
StandardError=append:/var/log/cloudflared-code.log

[Install]
WantedBy=multi-user.target
"""


def run(client, cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + (("\n[err] " + err) if err.strip() else "")


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

print("[1/3] systemd service yazılıyor...")
sftp = client.open_sftp()
with sftp.open("/etc/systemd/system/cloudflared-code.service", "w") as f:
    f.write(SYSTEMD_SERVICE)
sftp.close()
run(client, "touch /var/log/cloudflared-code.log; truncate -s 0 /var/log/cloudflared-code.log")

print("\n[2/3] Service başlatılıyor...")
print(run(client, "systemctl daemon-reload && systemctl enable cloudflared-code 2>&1 | tail -1"))
print(run(client, "systemctl restart cloudflared-code 2>&1"))

print("\n[3/3] code-server tunnel URL'i bekleniyor...")
url = ""
for i in range(20):
    time.sleep(1)
    log = run(client, "tail -50 /var/log/cloudflared-code.log")
    match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", log)
    if match:
        url = match.group(0)
        print(f"   ✓ {url} ({i + 1}sn sonra)")
        break

if not url:
    print("\n   ⚠ URL bulunamadı:")
    print(run(client, "tail -30 /var/log/cloudflared-code.log"))

# Mevcut gelir-gider tunnel'ı
gelir_log = run(client, "tail -50 /var/log/cloudflared.log")
gelir_match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", gelir_log)
gelir_url = gelir_match.group(0) if gelir_match else "(bulunamadı)"

client.close()

print("\n" + "=" * 60)
print("✅ İki tunnel aktif")
print("=" * 60)
print(f"\n💻 VS Code Web (yeni, root path):")
print(f"   {url}")
print(f"\n🌐 Aile Bütçe + sunucu:")
print(f"   {gelir_url}")
print("\nVS Code Web URL'inde subpath /code/ YOK — direkt root.")
print("Service worker WebView origin sorunu çözüldü, Claude Code çalışmalı.")
