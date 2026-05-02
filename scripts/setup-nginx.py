"""
nginx reverse proxy kurulumu.
Port 80 (cloud firewall'da default açık) → port 3001 (gelir-gider) yönlendirir.
Dashboard mevcut port 3000'de erişilebilir kalmaya devam eder.

Sonuç:
    http://161.97.156.48        → gelir-gider (portsuz, kolay erişim)
    http://161.97.156.48:3000   → dashboard (eskisi gibi)
"""
from __future__ import annotations
import sys
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

HOST = "161.97.156.48"
USER = "root"
PASSWORD = "a517o6tsEmexP5xSMTay"

NGINX_CONFIG = """server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # gelir-gider PWA — port 3001'de pm2 ile çalışıyor
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;

        # Service worker dosyası cache'lenmesin (PWA güncellemesi için kritik)
        add_header Cache-Control "no-cache" always;
    }

    # Static assets uzun cache (Vite hash'li dosyalar immutable)
    location ~* ^/assets/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # SW + manifest + index için no-cache
    location ~* ^/(sw\\.js|registerSW\\.js|manifest\\.webmanifest|workbox-.*\\.js|index\\.html)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }
}
"""


def run(client, cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if err and "warning" not in err.lower():
        out += f"\n[stderr] {err}"
    return out


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

print("=== nginx kontrol/kurulum ===")
nginx_check = run(client, "which nginx || (apt-get update -qq && apt-get install -y nginx 2>&1 | tail -3)")
print(nginx_check)

print("\n=== nginx config yazılıyor ===")
sftp = client.open_sftp()
with sftp.open("/etc/nginx/sites-available/gelir-gider", "w") as f:
    f.write(NGINX_CONFIG)
sftp.close()
print("   /etc/nginx/sites-available/gelir-gider yazıldı")

print("\n=== Default site devre dışı, gelir-gider aktif ===")
print(run(client, "rm -f /etc/nginx/sites-enabled/default; "
                  "ln -sf /etc/nginx/sites-available/gelir-gider /etc/nginx/sites-enabled/gelir-gider; "
                  "ls -la /etc/nginx/sites-enabled/"))

print("\n=== nginx config testi ===")
print(run(client, "nginx -t 2>&1"))

print("\n=== nginx reload ===")
print(run(client, "systemctl reload nginx 2>&1 || systemctl restart nginx 2>&1"))
print(run(client, "systemctl is-active nginx"))

print("\n=== Lokal curl testi ===")
print(run(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{size_download}b\\n' http://localhost/"))

client.close()
print("\n✅ nginx kuruldu. Test: http://161.97.156.48")
