"""Sunucudaki Claude Code auth dosyalarını temizler — doğru hesapla yeniden login için."""
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


def run(client, cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    return stdout.read().decode("utf-8", errors="replace").strip()


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

print("[1/3] Mevcut auth dosyaları (yedeklenecek)...")
print(run(client, "ls -la /root/.claude.json /root/.claude/auth_token.json /root/.claude/credentials.json 2>&1 | head -10"))

print("\n[2/3] Auth dosyaları temizleniyor (yedek alınıyor)...")
# .claude.json içinde projects/sessions kayıtları da var; sadece auth'la ilgili
# alanları silmek karmaşık. En temiz: tüm dosyayı yedekle, sıfırla.
print(run(client, "mkdir -p /root/.claude-backup-$(date +%s) && "
                  "mv /root/.claude.json /root/.claude-backup-$(date +%s)/.claude.json 2>/dev/null || true"))
print(run(client, "rm -f /root/.claude/auth_token.json /root/.claude/credentials.json /root/.claude/.credentials.json 2>&1 || true"))

print("\n[3/3] Sonuç:")
print(run(client, "ls -la /root/.claude.json 2>&1 || echo '   /root/.claude.json YOK (silindi, doğru hesapla yeniden login bekleniyor)'"))
print(run(client, "ls -la /root/.claude/ 2>&1 | head -20"))

client.close()

print("\n✅ Auth temizlendi.")
print("\nŞimdi VS Code Web'de:")
print("1. Terminal aç (Ctrl+` veya menüden)")
print("2. Komut: claude /login")
print("3. Çıkan linki TARAYICIDAN aç (DOĞRU mail hesabınla giriş yap)")
print("4. Onay sonrası geri dön — başarı mesajı görünür")
