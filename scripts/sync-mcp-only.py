"""
MCP serverlarını sunucudaki /root/.claude.json'a SFTP ile temiz inject.
sync-claude-config.py'deki shell-escape bug'ını bypass eder.
"""
from __future__ import annotations
import io
import json
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

LOCAL_CLAUDE_JSON = Path.home() / ".claude.json"


def run(client, cmd, timeout=60):
    _, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + (("\n[err] " + err) if err.strip() else "")


def main():
    # Yerel MCP serverlarını çıkar
    print("[1/4] Yerel MCP server tanımları okunuyor...")
    with open(LOCAL_CLAUDE_JSON, "r", encoding="utf-8") as f:
        local = json.load(f)

    top_mcp = local.get("mcpServers", {}) or {}
    nested_mcp = {}
    for proj, conf in (local.get("projects", {}) or {}).items():
        for name, server in ((conf or {}).get("mcpServers", {}) or {}).items():
            if name not in nested_mcp and name not in top_mcp:
                nested_mcp[name] = server

    merged = {**top_mcp, **nested_mcp}
    print(f"   → Bulunan: {list(merged.keys())}")

    # Sunucuya bağlan
    print("\n[2/4] Sunucuya bağlanılıyor...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

    # Mevcut .claude.json'u SFTP ile çek
    print("\n[3/4] Sunucudaki .claude.json çekilip merge ediliyor...")
    sftp = client.open_sftp()

    remote_path = "/root/.claude.json"
    server_data = {}
    try:
        with sftp.open(remote_path, "rb") as f:
            content = f.read().decode("utf-8")
        if content.strip():
            server_data = json.loads(content)
            print(f"   Mevcut top keys: {list(server_data.keys())[:8]}...")
        else:
            print("   (boş — yeni dosya oluşturulacak)")
    except (FileNotFoundError, IOError):
        print("   (.claude.json yok — yeni oluşturulacak)")

    # MCP merge
    existing = server_data.get("mcpServers", {}) or {}
    print(f"   Sunucudaki mevcut MCP: {list(existing.keys())}")

    # blender'ı .mcp.json'dan da ekle
    try:
        with sftp.open("/root/.claude/.mcp.json", "rb") as f:
            mcp_file = json.loads(f.read().decode("utf-8"))
        for name, server in (mcp_file.get("mcpServers", {}) or {}).items():
            if name not in merged:
                merged[name] = server
                print(f"   + .mcp.json'dan eklendi: {name}")
    except Exception:
        pass

    existing.update(merged)
    server_data["mcpServers"] = existing

    # Geri yaz
    out = json.dumps(server_data, ensure_ascii=False, indent=2)
    with sftp.open(remote_path, "wb") as f:
        f.write(out.encode("utf-8"))
    sftp.close()

    print(f"   ✓ Yazıldı — toplam MCP server: {list(existing.keys())}")

    # Doğrulama
    print("\n[4/4] Doğrulama...")
    print(run(
        client,
        "python3 -c \"import json; d=json.load(open('/root/.claude.json')); "
        "[print(' -', k, ':', v.get('command','?')) for k,v in d.get('mcpServers',{}).items()]\""
    ))

    client.close()
    print("\n✅ MCP serverlar sunucuya kuruldu.")


if __name__ == "__main__":
    main()
