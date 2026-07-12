#!/usr/bin/env bash
# Dump diário do MariaDB com rotação — ver seção "Backup do banco" no CLAUDE.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/.env"

BACKUP_DIR="/var/backups/tanquecerto"
RETENTION_DAYS=14
STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/tanquecerto_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Senha via --defaults-extra-file (arquivo temporário 600, apagado no fim mesmo
# se o script falhar) em vez de -p na linha de comando — evita expor a senha em
# `ps aux` pra qualquer usuário local.
CNF="$(mktemp)"
trap 'rm -f "$CNF"' EXIT
chmod 600 "$CNF"
cat > "$CNF" <<EOF
[client]
host=${DB_HOST}
port=${DB_PORT}
user=${DB_USER}
password=${DB_PASSWORD}
EOF

mysqldump --defaults-extra-file="$CNF" --single-transaction --quick "$DB_NAME" \
  | gzip > "$OUT_FILE"

find "$BACKUP_DIR" -name 'tanquecerto_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup OK: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
