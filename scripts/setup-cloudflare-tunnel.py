"""
Cloudflare Quick Tunnel kurulumu.
Self-signed cert yerine gerçek (Cloudflare CA) HTTPS sağlar — Claude Code
WebView gibi service-worker gerektiren özellikler çalışır.

Sonuç:
    https://xxx-xxx-xxx-xxx.trycloudflare.com → sunucu localhost:80

URL her cloudflared restart'ında değişebilir. Sabit URL için Cloudflare
hesabı + named tunnel gerekir (kullanıcı isterse sonra eklenir).
"""
from __future__ import annotations
import sys
import time
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
Description=Cloudflare Quick Tunnel (localhost:80 -> trycloudflare.com)
After=network.target nginx.service

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://localhost:80
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/cloudflared.log
StandardError=append:/var/log/cloudflared.log

[Install]
WantedBy=multi-user.target
"""


def run(client, cmd, timeout=300):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + (("\n[err] " + err) if err.strip() else "")


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

print("[1/5] cloudflared kuruluyor...")
out = run(
    client,
    "which cloudflared || ("
    "curl -fsSL --output /tmp/cloudflared.deb "
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb "
    "&& dpkg -i /tmp/cloudflared.deb 2>&1 | tail -3)",
    timeout=180,
)
print(out)
print("   Version:", run(client, "cloudflared --version 2>&1 | head -1"))

print("\n[2/5] systemd service yazılıyor...")
sftp = client.open_sftp()
with sftp.open("/etc/systemd/system/cloudflared.service", "w") as f:
    f.write(SYSTEMD_SERVICE)
sftp.close()
run(client, "touch /var/log/cloudflared.log; truncate -s 0 /var/log/cloudflared.log")

print("\n[3/5] Service başlatılıyor...")
print(run(client, "systemctl daemon-reload && systemctl enable cloudflared 2>&1"))
print(run(client, "systemctl restart cloudflared 2>&1"))

print("\n[4/5] Tunnel URL'i bekleniyor (15 sn)...")
url = ""
for i in range(15):
    time.sleep(1)
    log = run(client, "tail -50 /var/log/cloudflared.log")
    # URL pattern: https://xxx.trycloudflare.com
    import re
    match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", log)
    if match:
        url = match.group(0)
        print(f"   ✓ {url} ({i + 1}sn sonra bulundu)")
        break
    print(f"   bekleniyor... {i + 1}/15")

if not url:
    print("\n   ⚠ URL log'da bulunamadı. Mevcut log:")
    print(run(client, "tail -30 /var/log/cloudflared.log"))

print("\n[5/5] Doğrulama...")
print("   Service:", run(client, "systemctl is-active cloudflared"))
if url:
    print(f"   Tunnel:  {url}")

client.close()

print("\n" + "=" * 60)
print("✅ Cloudflare Tunnel kuruldu")
print("=" * 60)
if url:
    print(f"\n🔒 VS Code Web:  {url}/code/")
    print(f"🔒 Aile Bütçe:   {url}/")
    print("\n✓ Browser'da güvenli yeşil kilit görünür (gerçek Cloudflare CA cert).")
    print("✓ Service worker'lar çalışır → Claude Code WebView aktif olur.")
else:
    print("\n⚠ URL alınamadı. Manuel kontrol: ssh root@161.97.156.48 'tail -f /var/log/cloudflared.log'")
