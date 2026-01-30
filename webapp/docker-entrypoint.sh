#!/usr/bin/env sh
set -eu

# SQLite 文件路径一般会配置成：DATABASE_URL="file:/data/dev.db"
if [ "${DATABASE_URL:-}" != "" ]; then
  case "$DATABASE_URL" in
    file:/*)
      DB_PATH="${DATABASE_URL#file:}"
      DB_DIR="$(dirname "$DB_PATH")"
      mkdir -p "$DB_DIR"
      ;;
  esac
fi

echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy

exec "$@"

