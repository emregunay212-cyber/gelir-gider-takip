"""
VPS Deploy Script — gelir-gider-takip
======================================
Build edilmiş dist/ klasörünü kullanıcının kendi sunucusuna (161.97.156.48)
SFTP ile aktarır, statik dosya server'ı PM2 ile başlatır.

Kullanım:
    npm run build                       # önce dist/ oluştur
    python scripts/deploy-vps.py        # sonra deploy

Sonuç:
    http://161.97.156.48:3001
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Windows konsolu (cp1254) emoji yazdırmıyor — stdout'u UTF-8'e çevir
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import paramiko
except ImportError:
    print("paramiko yüklü değil. Kuruluyor...")
    os.system(f"{sys.executable} -m pip install paramiko")
    import paramiko

# ---------- Konfigürasyon ----------
HOST = "161.97.156.48"
USER = "root"
PASSWORD = "a517o6tsEmexP5xSMTay"
REMOTE_DIR = "/root/gelir-gider"
PORT = 3001
APP_NAME = "gelir-gider"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = PROJECT_ROOT / "dist"


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> str:
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if err:
        out += f"\n[stderr] {err}"
    return out


def upload_dir(sftp: paramiko.SFTPClient, local_dir: Path, remote_dir: str) -> int:
    """Bir dizini özyinelemeli olarak SFTP ile yükler. Yüklenen dosya sayısını döndürür."""
    count = 0
    try:
        sftp.mkdir(remote_dir)
    except IOError:
        pass  # zaten var

    for entry in local_dir.iterdir():
        local_path = entry
        remote_path = f"{remote_dir}/{entry.name}"
        if entry.is_dir():
            count += upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(str(local_path), remote_path)
            count += 1
    return count


def main() -> int:
    if not DIST_DIR.exists():
        print(f"❌ {DIST_DIR} bulunamadı. Önce 'npm run build' çalıştırın.")
        return 1

    print(f"🚀 Deploy başlıyor → {HOST}:{PORT}")
    print(f"   Local: {DIST_DIR}")
    print(f"   Remote: {REMOTE_DIR}/dist")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    sftp = client.open_sftp()

    # 1. Hedef klasör + eski dist temizliği
    print("\n📁 Hedef klasör hazırlanıyor...")
    run(client, f"mkdir -p {REMOTE_DIR}")
    run(client, f"rm -rf {REMOTE_DIR}/dist")
    print(f"   ✓ {REMOTE_DIR}/dist temizlendi")

    # 2. dist/ yükle
    print("\n📤 dist/ yükleniyor (SFTP)...")
    file_count = upload_dir(sftp, DIST_DIR, f"{REMOTE_DIR}/dist")
    print(f"   ✓ {file_count} dosya yüklendi")

    sftp.close()

    # 3. 'serve' paketi global kurulu mu?
    print("\n📦 Statik server kontrolü...")
    serve_check = run(client, "which serve || npm install -g serve 2>&1 | tail -3")
    print(f"   {serve_check.splitlines()[0] if serve_check else '(kurulu)'}")

    # 4. PM2 ile başlat (eski varsa restart)
    print(f"\n♻️  PM2 ile {APP_NAME} (port {PORT}) başlatılıyor...")
    pm2_cmd = (
        f"pm2 delete {APP_NAME} 2>/dev/null; "
        f"pm2 start serve --name {APP_NAME} -- -s {REMOTE_DIR}/dist -l {PORT}"
        f" && pm2 save"
    )
    pm2_out = run(client, pm2_cmd, timeout=60)
    print("\n".join(pm2_out.splitlines()[-8:]))

    # 5. Doğrulama
    print(f"\n🔍 Sağlık kontrolü...")
    health = run(client, f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{PORT}/")
    if health.strip().startswith("200") or health.strip().startswith("304"):
        print(f"   ✓ HTTP {health.strip()} — site canlı")
    else:
        print(f"   ⚠ HTTP {health.strip()}")

    pm2_status = run(client, f"pm2 list 2>&1 | grep {APP_NAME} || echo 'PM2 entry not found'")
    print(f"   {pm2_status}")

    client.close()

    print("\n✅ Deploy tamam!")
    print(f"\n🌐 Site: http://{HOST}:{PORT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
