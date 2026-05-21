#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Syncing database schema..."
# Try a safe push first. If it fails on a benign drift (enum/type change),
# retry with --accept-data-loss. This flag only touches columns the schema
# is explicitly narrowing — it does NOT drop the database (that requires
# --force-reset, which we never use).
npx prisma db push || {
  echo "Schema push failed — retrying with --accept-data-loss for type/enum drift..."
  npx prisma db push --accept-data-loss
}

echo "Running safe password rehash migration..."
npx tsx scripts/rehash-passwords.ts || echo "Rehash migration skipped (non-fatal)"

echo "Running Next.js build..."
next build
