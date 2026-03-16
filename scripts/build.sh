#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Running pre-push data migration..."
npx prisma db execute --file scripts/pre-push-migrate.sql --schema prisma/schema.prisma || echo "Pre-push migration skipped (may already be applied)"

echo "Syncing database schema..."
npx prisma db push --accept-data-loss

echo "Running database seed (refreshes password hashes)..."
npx tsx prisma/seed.ts || echo "Seed skipped"

echo "Running Next.js build..."
next build
