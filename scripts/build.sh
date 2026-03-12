#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Running Prisma migrate deploy..."
if npx prisma migrate deploy 2>&1; then
  echo "Migrations applied successfully."
else
  echo "Migration failed — attempting to baseline existing migrations..."
  for dir in prisma/migrations/*/; do
    migration_name=$(basename "$dir")
    if [ "$migration_name" != "migration_lock.toml" ]; then
      echo "Resolving migration: $migration_name"
      npx prisma migrate resolve --applied "$migration_name" || true
    fi
  done
  echo "Retrying migrate deploy..."
  npx prisma migrate deploy
fi

echo "Running Next.js build..."
next build
