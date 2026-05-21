#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Syncing database schema..."
# Plain db push only. We deliberately do NOT pass --accept-data-loss or
# --force-reset — both can silently destroy production rows. If push fails
# because the live DB has tables/columns/enum values that the schema does
# not model, the correct fix is to update prisma/schema.prisma so the
# data is preserved.
npx prisma db push

echo "Running safe password rehash migration..."
npx tsx scripts/rehash-passwords.ts || echo "Rehash migration skipped (non-fatal)"

echo "Running Next.js build..."
next build
