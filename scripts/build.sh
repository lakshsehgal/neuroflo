#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Syncing database schema..."
npx prisma db push --accept-data-loss

echo "Running Next.js build..."
next build
