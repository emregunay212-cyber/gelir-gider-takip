"""
Self-signed SSL cert + nginx 443 setup.
Domain gerekmez — IP-based HTTPS. Browser'da "Not Secure" uyarısı çıkar
ama "Advanced > Proceed" ile geçilir. Sonra Claude Code WebView çalışır.

Sonuç:
    https://161.97.156.48/code/   → VS Code Web (HTTPS)
    https://161.97.156.48/        → Aile Bütçe (HTTPS)
    http://161.97.156.48/         → eskisi gibi (yönlendirilmez, isteğe bağlı)
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

NGINX_CONFIG = """# WebSocket destekli upgrade map
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Ortak location'lar (HTTP ve HTTPS server'larında kullanılır)
# Direkt include yerine her server'da inline yazıldı (basitlik için)

# ─────────── HTTP (port 80) ───────────
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 100M;

    location /code/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 7d;
        proxy_send_timeout 7d;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-cache" always;
    }

    location ~* ^/assets/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location ~* ^/(sw\\.js|registerSW\\.js|manifest\\.webmanifest|workbox-.*\\.js|index\\.html)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }
}

# ─────────── HTTPS (port 443) ───────────
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name _;
    client_max_body_size 100M;

    ssl_certificate /etc/ssl/private/code-server.crt;
    ssl_certificate_key /etc/ssl/private/code-server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location /code/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 7d;
        proxy_send_timeout 7d;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-cache" always;
    }

    location ~* ^/assets/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

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
    return out + (("\n[err] " + err) if err.strip() else "")


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

print("[1/5] Self-signed SSL cert oluşturuluyor...")
out = run(
    client,
    "mkdir -p /etc/ssl/private && "
    "openssl req -x509 -nodes -newkey rsa:2048 "
    "-keyout /etc/ssl/private/code-server.key "
    "-out /etc/ssl/private/code-server.crt "
    "-days 3650 "
    '-subj "/C=TR/ST=Istanbul/L=Istanbul/O=AileButce/CN=161.97.156.48" '
    "-addext 'subjectAltName=IP:161.97.156.48,DNS:localhost' 2>&1 | tail -3 && "
    "chmod 600 /etc/ssl/private/code-server.key",
    timeout=60,
)
print(out)

print("\n[2/5] nginx config (HTTP + HTTPS) yazılıyor...")
sftp = client.open_sftp()
with sftp.open("/etc/nginx/sites-available/gelir-gider", "w") as f:
    f.write(NGINX_CONFIG)
sftp.close()

print("\n[3/5] nginx config testi...")
print(run(client, "nginx -t 2>&1"))

print("\n[4/5] nginx reload...")
print(run(client, "systemctl reload nginx 2>&1"))

print("\n[5/5] Doğrulama...")
print("  HTTP 80:", run(client, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost/"))
print("  HTTPS 443:", run(client, "curl -k -s -o /dev/null -w 'HTTPS %{http_code}' https://localhost/"))
print("  HTTPS code-server:", run(client, "curl -k -s -o /dev/null -w 'HTTPS %{http_code}' https://localhost/code/"))

client.close()

print("\n" + "=" * 60)
print("✅ HTTPS kuruldu")
print("=" * 60)
print("\n🔒 https://161.97.156.48/code/  ← VS Code Web (HTTPS)")
print("🔒 https://161.97.156.48/       ← Aile Bütçe (HTTPS)")
print("\n⚠ İlk girişte browser 'Not Secure' uyarısı verecek.")
print("   Self-signed olduğu için normal. 'Advanced' → 'Proceed to 161.97.156.48 (unsafe)' ile devam.")
print("   Bu sadece bir kez gerek. Sonra Claude Code çalışır.")
