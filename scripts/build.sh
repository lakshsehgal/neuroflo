#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Running Next.js build..."
next build
