"""
Sunucuya 'dev' komutu kurar — mobile/SSH için pratik launcher.
Kullanıcı tek komutla projeyi seçer ve Claude Code başlatır.
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

DEV_SCRIPT = '''#!/usr/bin/env bash
# dev — Claude Code launcher (mobile-friendly)
set -e

WORKSPACE="${WORKSPACE:-/root/workspace}"
mkdir -p "$WORKSPACE"

# Renk
B="\\033[1m"; G="\\033[32m"; Y="\\033[33m"; C="\\033[36m"; R="\\033[0m"

echo -e "${B}${C}╔═══════════════════════════════════════╗${R}"
echo -e "${B}${C}║       Claude Code Launcher (dev)       ║${R}"
echo -e "${B}${C}╚═══════════════════════════════════════╝${R}"
echo ""

# Mevcut projeler
projects=()
i=1
echo -e "${B}Mevcut projeler:${R}"
for d in "$WORKSPACE"/*/; do
    [ -d "$d" ] || continue
    name=$(basename "$d")
    git_status=""
    if [ -d "$d/.git" ]; then
        cd "$d"
        if [ -n "$(git status -s 2>/dev/null)" ]; then
            git_status="${Y}*${R}"
        fi
        branch=$(git branch --show-current 2>/dev/null || echo "")
        [ -n "$branch" ] && git_status="$git_status (${C}$branch${R})"
        cd - >/dev/null
    fi
    echo -e "  ${G}[$i]${R} $name $git_status"
    projects+=("$name")
    ((i++))
done

if [ ${#projects[@]} -eq 0 ]; then
    echo -e "  ${Y}(henüz proje yok)${R}"
fi

echo ""
echo -e "  ${G}[n]${R} Yeni proje"
echo -e "  ${G}[c]${R} Mevcut projeyi git clone et"
echo -e "  ${G}[q]${R} Çıkış"
echo ""
read -p "Seç: " choice

case "$choice" in
    q|Q|"")
        exit 0
        ;;
    n|N)
        read -p "Yeni proje adı: " name
        if [ -z "$name" ]; then
            echo "İptal."
            exit 1
        fi
        target="$WORKSPACE/$name"
        if [ -d "$target" ]; then
            echo -e "${Y}Zaten var: $target${R}"
        else
            mkdir -p "$target"
            cd "$target"
            git init -q
            echo "# $name" > README.md
            echo -e "${G}Oluşturuldu:${R} $target"
        fi
        cd "$target"
        ;;
    c|C)
        read -p "Git URL: " url
        if [ -z "$url" ]; then
            echo "İptal."
            exit 1
        fi
        cd "$WORKSPACE"
        git clone "$url"
        name=$(basename "$url" .git)
        cd "$name"
        echo -e "${G}Klonlandı:${R} $WORKSPACE/$name"
        ;;
    *)
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#projects[@]} ]; then
            name="${projects[$((choice-1))]}"
            cd "$WORKSPACE/$name"
        else
            echo -e "${Y}Geçersiz seçim.${R}"
            exit 1
        fi
        ;;
esac

echo ""
echo -e "${B}→ $(pwd)${R}"
echo -e "${C}claude başlatılıyor...${R}"
echo ""
exec claude
'''


def run(client, cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    return stdout.read().decode("utf-8", errors="replace").strip()


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

print("[1/3] /usr/local/bin/dev script yazılıyor...")
sftp = client.open_sftp()
with sftp.open("/usr/local/bin/dev", "w") as f:
    f.write(DEV_SCRIPT)
sftp.close()
run(client, "chmod +x /usr/local/bin/dev")
print("   ✓ /usr/local/bin/dev (executable)")

print("\n[2/3] Bash welcome mesajı (.bashrc)...")
welcome = '''
# Claude Code dev launcher
if [ -z "$CLAUDE_DEV_GREETED" ]; then
    export CLAUDE_DEV_GREETED=1
    echo ""
    echo "  Komutlar:"
    echo "    dev       → proje seç + claude başlat"
    echo "    claude    → mevcut klasörde claude"
    echo "    pm2 list  → çalışan servisler"
    echo ""
fi
'''
# Append olunca duplicate olmasın diye marker kontrolü
existing = run(client, "grep -c 'CLAUDE_DEV_GREETED' /root/.bashrc 2>/dev/null || echo 0")
if existing.strip() == "0":
    sftp = client.open_sftp()
    with sftp.file("/root/.bashrc", "a") as f:
        f.write(welcome)
    sftp.close()
    print("   ✓ /root/.bashrc'ye welcome eklendi")
else:
    print("   (zaten ekli, atlandı)")

print("\n[3/3] Test...")
print(run(client, "ls -la /usr/local/bin/dev"))
print(run(client, "head -20 /usr/local/bin/dev"))

client.close()

print("\n" + "=" * 60)
print("✅ 'dev' launcher kuruldu")
print("=" * 60)
print("\nSSH ile bağlandığında ya da VS Code terminal'de:")
print("    dev")
print("\nProjeyi seç → Claude Code otomatik başlar.")
