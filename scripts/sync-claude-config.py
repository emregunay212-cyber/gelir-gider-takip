"""
Yerel ~/.claude/ → sunucu /root/.claude/ senkronizasyonu.

Sync edilenler:
  - skills/      (93 skill, ~1.8MB)
  - agents/      (48 agent, ~328KB)
  - commands/    (79 slash command, ~498KB)
  - rules/       (kodlama kuralları, ~371KB)
  - hooks/       (PreToolUse/PostToolUse, ~44KB)
  - plugins/superpowers/             (özel plugin kodu, ~3.6MB)
  - plugins/installed_plugins.json   (plugin manifest)
  - plugins/known_marketplaces.json  (marketplace registry)
  - .mcp.json                         (user-level MCP konfigürasyonu)

MCP serverlar (.claude.json'dan çekilip sunucuya merge):
  - playwright, shadcn, magic, blender

Sync EDİLMEYENLER (hassas/yerel):
  - .credentials.json (auth token — sunucu kendi login'i kullanır)
  - bash-commands.log, cost-tracker.log
  - cache/, debug/, projects/, sessions/, session-data/, session-env/
  - shell-snapshots/, telemetry/, metrics/, backups/, plans/
  - plugins/cache/ (572MB), plugins/marketplaces/ (164MB) — sunucu yeniden indirir
  - .claude.json (sadece mcpServers anahtarı çekilir, geri kalanı kişisel)
"""
from __future__ import annotations
import io
import json
import os
import sys
import tarfile
import time
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

LOCAL_CLAUDE = Path.home() / ".claude"
LOCAL_CLAUDE_JSON = Path.home() / ".claude.json"

# tar.gz içine eklenen yollar (LOCAL_CLAUDE altında relative)
INCLUDE_DIRS = [
    "skills",
    "agents",
    "commands",
    "rules",
    "hooks",
    "plugins/superpowers",
]
INCLUDE_FILES = [
    "plugins/installed_plugins.json",
    "plugins/known_marketplaces.json",
    "plugins/blocklist.json",
    "plugins/install-counts-cache.json",
    "mcp-configs/mcp-servers.json",
    ".mcp.json",
    "AGENTS.md",
    "marketplace.json",
    "plugin.json",
]


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> str:
    _, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + (("\n[err] " + err) if err.strip() else "")


def build_tarball() -> bytes:
    """In-memory tar.gz: ~/.claude/<INCLUDE_*>"""
    buf = io.BytesIO()
    added = 0
    skipped = 0

    with tarfile.open(fileobj=buf, mode="w:gz", compresslevel=6) as tar:
        for rel in INCLUDE_DIRS:
            src = LOCAL_CLAUDE / rel
            if not src.exists():
                print(f"   ! atlandı (yok): {rel}")
                skipped += 1
                continue

            def filter_fn(tarinfo: tarfile.TarInfo) -> tarfile.TarInfo | None:
                # Yerel-only dosyaları çıkar
                lower = tarinfo.name.lower()
                bad = ("__pycache__", ".git/", "/cache/", "node_modules", ".log",
                       ".lock", ".tmp", "credentials")
                if any(b in lower for b in bad):
                    return None
                return tarinfo

            tar.add(src, arcname=rel, filter=filter_fn)
            added += 1
            print(f"   ✓ {rel}")

        for rel in INCLUDE_FILES:
            src = LOCAL_CLAUDE / rel
            if not src.exists():
                print(f"   ! atlandı (yok): {rel}")
                skipped += 1
                continue
            tar.add(src, arcname=rel)
            added += 1
            print(f"   ✓ {rel}")

    print(f"   → {added} öge eklendi, {skipped} atlandı")
    return buf.getvalue()


def extract_mcp_servers() -> dict:
    """Yerel .claude.json'dan mcpServers anahtarını çek."""
    if not LOCAL_CLAUDE_JSON.exists():
        return {}
    try:
        with open(LOCAL_CLAUDE_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"   ⚠ .claude.json okunamadı: {e}")
        return {}

    # Üst seviye mcpServers
    top = data.get("mcpServers", {}) or {}

    # Project-level mcpServers (eğer projects altında varsa)
    nested = {}
    for proj_path, proj_data in (data.get("projects", {}) or {}).items():
        mcp = (proj_data or {}).get("mcpServers", {})
        for name, conf in (mcp or {}).items():
            if name not in nested and name not in top:
                nested[name] = conf

    merged = {**top, **nested}
    print(f"   → MCP server tanımı: {list(merged.keys())}")
    return merged


def main() -> None:
    print("[1/6] Yerel tar.gz oluşturuluyor (skills, agents, commands, ...)...")
    tarball = build_tarball()
    size_mb = len(tarball) / 1024 / 1024
    print(f"   → tar.gz boyutu: {size_mb:.2f} MB")

    print("\n[2/6] MCP server konfigürasyonu çıkarılıyor...")
    mcp_servers = extract_mcp_servers()

    print("\n[3/6] Sunucuya bağlanılıyor...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

    print("\n[4/6] Mevcut /root/.claude/ yedekleniyor...")
    ts = int(time.time())
    backup_cmd = (
        f"if [ -d /root/.claude ]; then "
        f"cp -a /root/.claude /root/.claude-backup-{ts} 2>/dev/null && "
        f"echo 'Yedek: /root/.claude-backup-{ts}'; "
        f"else echo 'Yedek atlandı (yok)'; fi"
    )
    print("   " + run(client, backup_cmd))

    # Hassas dosyaları ÜZERİNE YAZMA — koru
    print("\n   Auth dosyaları korunuyor (üzerine yazmayacak)...")
    preserve_cmd = (
        "mkdir -p /tmp/claude-preserve && "
        "for f in /root/.claude/.credentials.json /root/.claude.json "
        "/root/.claude/auth_token.json; do "
        "  [ -f \"$f\" ] && cp -a \"$f\" /tmp/claude-preserve/ 2>/dev/null; "
        "done && ls /tmp/claude-preserve/ 2>/dev/null"
    )
    preserved = run(client, preserve_cmd)
    print("   Korunanlar: " + (preserved or "(yok)"))

    print("\n[5/6] tar.gz yükleniyor ve extract ediliyor...")
    sftp = client.open_sftp()
    remote_path = "/tmp/claude-config.tar.gz"
    with sftp.open(remote_path, "wb") as f:
        f.write(tarball)
    sftp.close()
    print(f"   ✓ Yüklendi: {remote_path}")

    extract_cmd = (
        "mkdir -p /root/.claude && "
        "tar -xzf /tmp/claude-config.tar.gz -C /root/.claude/ && "
        "rm -f /tmp/claude-config.tar.gz && "
        "echo 'Extract OK'"
    )
    print("   " + run(client, extract_cmd, timeout=180))

    # Auth dosyalarını geri yükle
    print("\n   Auth dosyaları geri yükleniyor...")
    restore_cmd = (
        "for f in /tmp/claude-preserve/*; do "
        "  [ -f \"$f\" ] || continue; "
        "  base=$(basename \"$f\"); "
        "  if [ \"$base\" = \".claude.json\" ]; then "
        "    cp -a \"$f\" /root/.claude.json; "
        "  else "
        "    cp -a \"$f\" /root/.claude/$base; "
        "  fi; "
        "done && rm -rf /tmp/claude-preserve && echo 'Auth restored'"
    )
    print("   " + run(client, restore_cmd))

    print("\n[6/6] MCP server'lar /root/.claude.json'a inject ediliyor...")
    if mcp_servers:
        # JSON literal olarak gönder
        mcp_json = json.dumps(mcp_servers, ensure_ascii=False)

        # Python tek satır script — mevcut .claude.json'a mcpServers'ı merge et
        inject_script = f'''python3 -c "
import json, os
path = '/root/.claude.json'
incoming = {mcp_json!r}
new_mcp = json.loads(incoming)
data = {{}}
if os.path.exists(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        data = {{}}
existing = data.get('mcpServers', {{}}) or {{}}
existing.update(new_mcp)
data['mcpServers'] = existing
with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('MCP servers in /root/.claude.json:', list(existing.keys()))
"'''
        print("   " + run(client, inject_script))
    else:
        print("   (sync edilecek MCP yok)")

    # Permissions
    run(client, "chmod -R u+rw /root/.claude/")

    # Doğrulama
    print("\n" + "=" * 60)
    print("✅ Sync tamamlandı — doğrulama:")
    print("=" * 60)
    print("Skill sayısı:   " + run(client, "ls /root/.claude/skills/ 2>/dev/null | wc -l"))
    print("Agent sayısı:   " + run(client, "ls /root/.claude/agents/ 2>/dev/null | wc -l"))
    print("Command sayısı: " + run(client, "ls /root/.claude/commands/ 2>/dev/null | wc -l"))
    print("Hooks:          " + run(client, "ls /root/.claude/hooks/ 2>/dev/null | head -5"))
    print("Rules:          " + run(client, "ls /root/.claude/rules/ 2>/dev/null"))
    print("MCP config:     " + run(client, "cat /root/.claude/.mcp.json 2>/dev/null | head -10"))
    print("MCP user-level: " + run(client,
        "python3 -c \"import json; "
        "d=json.load(open('/root/.claude.json')); "
        "print(list(d.get('mcpServers', {}).keys()))\" 2>/dev/null || echo '(yok)'"))
    print("Disk usage:     " + run(client, "du -sh /root/.claude/"))

    client.close()

    print("\n" + "=" * 60)
    print("📱 Şimdi Termius'tan:")
    print("    dev")
    print("    [1] gelir-gider-takip")
    print("    /skills (veya /help) — skill/komut listesi görünür")
    print("=" * 60)


if __name__ == "__main__":
    main()
