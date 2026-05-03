"""
VPS'i geliştirme platformuna dönüştürür.
- code-server (VS Code Web) — http://161.97.156.48/code/
- Claude Code CLI — code-server terminal'inden
- /root/workspace/ — tüm projeler buraya
- nginx subpath reverse proxy
- systemd service: yeniden başlatmada otomatik

Kullanım:
    python scripts/setup-dev-platform.py
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

CODE_SERVER_PASSWORD = "Emre1010."
CODE_SERVER_PORT = 8080  # localhost'ta dinler, dış erişim nginx /code/ üzerinden

# code-server config
CODE_SERVER_CONFIG = f"""bind-addr: 127.0.0.1:{CODE_SERVER_PORT}
auth: password
password: {CODE_SERVER_PASSWORD}
cert: false
disable-telemetry: true
disable-update-check: true
"""

# nginx config — /code/ alt path code-server'a, kalan her şey gelir-gider'e
NGINX_CONFIG = f"""# WebSocket destekli upgrade map (code-server için kritik)
map $http_upgrade $connection_upgrade {{
    default upgrade;
    '' close;
}}

server {{
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 100M;

    # ─────────── code-server (VS Code Web) ───────────
    location /code/ {{
        proxy_pass http://127.0.0.1:{CODE_SERVER_PORT}/;
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
    }}

    # ─────────── gelir-gider PWA (default) ───────────
    location / {{
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
        add_header Cache-Control "no-cache" always;
    }}

    location ~* ^/assets/ {{
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }}

    location ~* ^/(sw\\.js|registerSW\\.js|manifest\\.webmanifest|workbox-.*\\.js|index\\.html)$ {{
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }}
}}
"""

# code-server systemd service
SYSTEMD_SERVICE = """[Unit]
Description=code-server
After=network.target

[Service]
Type=exec
User=root
ExecStart=/usr/bin/code-server --config /root/.config/code-server/config.yaml /root/workspace
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
"""


def run(client, cmd, timeout=300):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + (("\n[err] " + err) if err.strip() else "")


def main():
    print("=" * 60)
    print("VPS Geliştirme Platformu Kurulumu")
    print("=" * 60)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

    # 1. code-server kur (curl install script)
    print("\n[1/8] code-server kuruluyor...")
    out = run(
        client,
        "which code-server || curl -fsSL https://code-server.dev/install.sh | sh 2>&1 | tail -5",
        timeout=600,
    )
    print(out[-500:] if len(out) > 500 else out)

    version = run(client, "code-server --version 2>&1 | head -1")
    print(f"   Version: {version}")

    # 2. code-server config
    print("\n[2/8] code-server config yazılıyor...")
    sftp = client.open_sftp()
    run(client, "mkdir -p /root/.config/code-server")
    with sftp.open("/root/.config/code-server/config.yaml", "w") as f:
        f.write(CODE_SERVER_CONFIG)
    print(f"   /root/.config/code-server/config.yaml (port {CODE_SERVER_PORT})")

    # 3. Workspace klasörü + gelir-gider klone
    print("\n[3/8] Workspace klasörü hazırlanıyor...")
    run(client, "mkdir -p /root/workspace")
    out = run(
        client,
        "cd /root/workspace && [ -d gelir-gider-takip ] || git clone https://github.com/emregunay212-cyber/gelir-gider-takip.git 2>&1 | tail -3",
    )
    print(f"   /root/workspace/")
    print(out)

    # 4. Claude Code CLI
    print("\n[4/8] Claude Code CLI kuruluyor...")
    out = run(
        client,
        "which claude || npm install -g @anthropic-ai/claude-code 2>&1 | tail -5",
        timeout=300,
    )
    print(out[-300:] if len(out) > 300 else out)
    claude_version = run(client, "claude --version 2>&1 | head -1")
    print(f"   Version: {claude_version}")

    # 5. systemd service
    print("\n[5/8] systemd service oluşturuluyor...")
    with sftp.open("/etc/systemd/system/code-server.service", "w") as f:
        f.write(SYSTEMD_SERVICE)
    sftp.close()
    print(run(client, "systemctl daemon-reload && systemctl enable code-server 2>&1"))
    print(run(client, "systemctl restart code-server 2>&1; systemctl is-active code-server"))

    # 6. nginx config update
    print("\n[6/8] nginx config güncelleniyor (subpath /code/)...")
    sftp = client.open_sftp()
    with sftp.open("/etc/nginx/sites-available/gelir-gider", "w") as f:
        f.write(NGINX_CONFIG)
    sftp.close()
    print(run(client, "nginx -t 2>&1"))
    print(run(client, "systemctl reload nginx 2>&1"))

    # 7. Sağlık kontrolü
    print("\n[7/8] Sağlık kontrolleri...")
    print("   gelir-gider:", run(client, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost/"))
    print("   code-server:", run(client, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost/code/"))
    print("   pm2 list:")
    print(run(client, "pm2 list 2>&1 | grep -E 'name|gelir|dashboard'"))
    print("   systemctl code-server:", run(client, "systemctl is-active code-server"))

    # 8. Bilgi
    print("\n[8/8] Tamam!")
    client.close()

    print("\n" + "=" * 60)
    print("✅ KURULUM TAMAM")
    print("=" * 60)
    print(f"\n🌐 VS Code Web: http://{HOST}/code/")
    print(f"   Şifre: {CODE_SERVER_PASSWORD}")
    print(f"\n🌐 Aile Bütçe:  http://{HOST}/")
    print(f"\n📁 Workspace:   /root/workspace/  (sunucuda)")
    print("\n🤖 Claude Code: VS Code Web → Terminal aç → 'claude' komutu")
    print("   İlk seferde 'claude /login' ile Claude Max hesabınla bağlan.")


if __name__ == "__main__":
    main()
