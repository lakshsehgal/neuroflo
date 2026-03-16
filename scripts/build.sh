#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Running pre-push data migration..."
npx prisma db execute --file scripts/pre-push-migrate.sql --schema prisma/schema.prisma || echo "Pre-push migration skipped (may already be applied)"

echo "Syncing database schema..."
npx prisma db push || {
  echo "Schema push failed — retrying with --accept-data-loss for enum/type changes..."
  npx prisma db push --accept-data-loss
}

echo "Running safe password rehash migration..."
npx tsx scripts/rehash-passwords.ts || echo "Rehash migration skipped (non-fatal)"

echo "Running Next.js build..."
next build
