#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Running safe password rehash migration..."
npx tsx scripts/rehash-passwords.ts || echo "Rehash migration skipped (non-fatal)"

echo "Running Next.js build..."
npx next build
