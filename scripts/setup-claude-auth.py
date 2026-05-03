"""
Sunucuya Claude Code auth dosyalarını kopyala + gelir-gider-takip clone et.
Lokal makinedeki ~/.claude.json + ~/.claude/ dizinini SFTP ile yükler.
"""
from __future__ import annotations
import os
import sys
from pathlib import Path
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

HOST = "161.97.156.48"
USER = "root"
PASSWORD = "a517o6tsEmexP5xSMTay"

LOCAL_HOME = Path(os.environ.get("USERPROFILE") or Path.home())
LOCAL_CLAUDE_JSON = LOCAL_HOME / ".claude.json"
LOCAL_CLAUDE_DIR = LOCAL_HOME / ".claude"


def run(client, cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + (("\n[err] " + err) if err.strip() else "")


def upload_file(sftp, local: Path, remote: str):
    if not local.exists():
        print(f"   ⚠ {local} yok — atlandı")
        return False
    sftp.put(str(local), remote)
    print(f"   ✓ {local.name} → {remote}")
    return True


def upload_selected_dir(sftp, client, local_dir: Path, remote_dir: str):
    """Sadece auth ile ilgili dosyaları yükler — log ve cache atlanır."""
    if not local_dir.exists():
        print(f"   ⚠ {local_dir} yok — atlandı")
        return 0

    # Auth için kritik dosyalar
    important = [
        "auth_token.json",
        "credentials.json",
        ".credentials.json",
        "settings.json",
    ]

    run(client, f"mkdir -p {remote_dir}")
    count = 0
    for entry in local_dir.iterdir():
        if entry.is_file() and entry.name in important:
            sftp.put(str(entry), f"{remote_dir}/{entry.name}")
            print(f"   ✓ {entry.name}")
            count += 1
    return count


def main():
    print("=" * 60)
    print("Claude Code Auth Sync + Repo Clone")
    print("=" * 60)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    sftp = client.open_sftp()

    # 1. Repo clone (public oldu)
    print("\n[1/4] gelir-gider-takip klonlanıyor...")
    out = run(
        client,
        "cd /root/workspace && rm -rf gelir-gider-takip && "
        "git clone https://github.com/emregunay212-cyber/gelir-gider-takip.git 2>&1 | tail -3",
    )
    print(out)

    # 2. .claude.json kopyala (auth burada)
    print("\n[2/4] ~/.claude.json kopyalanıyor (Claude Code auth)...")
    upload_file(sftp, LOCAL_CLAUDE_JSON, "/root/.claude.json")

    # 3. ~/.claude/ dizininden auth dosyaları
    print("\n[3/4] ~/.claude/ dizininden auth dosyaları...")
    count = upload_selected_dir(sftp, client, LOCAL_CLAUDE_DIR, "/root/.claude")
    print(f"   {count} dosya yüklendi")

    # 4. İzinleri ayarla
    run(client, "chmod 600 /root/.claude.json 2>&1 || true")
    run(client, "chmod -R 700 /root/.claude 2>&1 || true")

    sftp.close()

    # 5. Test
    print("\n[4/4] Test: claude doctor + auth status...")
    print(run(client, "claude --version 2>&1 | head -2"))
    print(run(client, "claude doctor 2>&1 | head -10 || claude config 2>&1 | head -5"))

    client.close()

    print("\n" + "=" * 60)
    print("✅ Sync Tamam")
    print("=" * 60)
    print("\nVS Code Web → Terminal → 'claude' komutu ile başla.")
    print(f"Repo: /root/workspace/gelir-gider-takip/")


if __name__ == "__main__":
    main()
