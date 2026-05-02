"""Firewall + PM2 + port durumu kontrolü ve port 3001 açma."""
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
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + (("\n[err] " + err) if err else "")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

print("=== PM2 listesi ===")
print(run(client, "pm2 list"))

print("\n=== Listening ports (3000, 3001) ===")
print(run(client, "ss -tlnp | grep -E ':(3000|3001)' || netstat -tlnp 2>/dev/null | grep -E ':(3000|3001)'"))

print("\n=== Firewall durumu ===")
print(run(client, "ufw status verbose 2>&1 || echo 'ufw yok'"))

print("\n=== iptables INPUT ===")
print(run(client, "iptables -L INPUT -n --line-numbers 2>&1 | head -20"))

print("\n=== Port 3001 açılıyor (ufw varsa) ===")
print(run(client, "ufw allow 3001/tcp 2>&1 || iptables -I INPUT -p tcp --dport 3001 -j ACCEPT && echo 'iptables ile açıldı'"))

print("\n=== Lokal curl testi ===")
print(run(client, "curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:3001/"))

client.close()
