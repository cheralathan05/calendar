#!/usr/bin/env sh
# ...existing code...
# Entrypoint script for running Prisma migrations before starting the NestJS app
# Usage: copied into Docker image and set as ENTRYPOINT or used as part of CMD

set -e

echo "[entrypoint] waiting for database to be ready..."
# If DATABASE_URL uses a host name like 'db', rely on Docker compose healthcheck or external DB.
# We attempt to run migrations directly; if DB is not ready, prisma will retry a few times.

# Run prisma migrate deploy (non-interactive) and then run seed if available
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running prisma migrate deploy"
  pnpm --filter=api exec prisma migrate deploy || {
    echo "[entrypoint] prisma migrate deploy failed";
    exit 1;
  }

  # Run seed if script exists
  if [ -f "apps/api/prisma/seed.ts" ] || [ -f "apps/api/prisma/seed.js" ]; then
    echo "[entrypoint] Running prisma db seed"
    pnpm --filter=api exec prisma db seed || echo "[entrypoint] prisma db seed failed (continuing)"
  fi
else
  echo "[entrypoint] DATABASE_URL not set, skipping migrations"
fi

# Exec the final command (passed as arguments)
exec "$@"
