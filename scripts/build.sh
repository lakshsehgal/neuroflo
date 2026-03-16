#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Syncing database schema..."
npx prisma db push

echo "Running safe password rehash migration..."
npx tsx scripts/rehash-passwords.ts || echo "Rehash migration skipped (non-fatal)"

echo "Running Next.js build..."
next build
