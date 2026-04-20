#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Running one-time workflow tables cleanup..."
npx tsx scripts/cleanup-workflow-tables.ts || echo "Cleanup skipped (non-fatal)"

echo "Syncing database schema..."
npx prisma db push

echo "Running safe password rehash migration..."
npx tsx scripts/rehash-passwords.ts || echo "Rehash migration skipped (non-fatal)"

echo "Running Next.js build..."
npx next build
