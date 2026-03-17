# CLAUDE.md — NeuroFlo Project Guide

## Project Overview

NeuroFlo is an agency management platform built with **Next.js 15 (App Router)**, **Prisma ORM**, **PostgreSQL (Neon)**, and deployed on **Vercel**.

## Critical Safety Rules (NEVER VIOLATE)

### 1. NEVER Run Seed on Production

The seed script (`prisma/seed.ts`) starts with `deleteMany()` on ALL tables — it **wipes every user, project, ticket, task, and message**. It exists only for local/dev database setup.

- **NEVER** run `npm run db:seed` or `tsx prisma/seed.ts` against a production database
- **NEVER** run `npm run db:reset` or `prisma migrate reset` — this drops and recreates the entire database
- If a user asks to "reset the database" or "reseed", **always confirm** they mean a dev/staging DB, not production

### 2. Migrations Must Be Additive Only

When modifying `prisma/schema.prisma`:

- **SAFE**: Adding new models, adding new optional fields (`String?`), adding new enums, adding new relations with optional FK
- **DANGEROUS**: Dropping columns, dropping tables, renaming columns/tables, changing column types, making nullable columns required
- For any destructive schema change, **always warn the user** and suggest a 2-step approach:
  1. First deploy: stop using the column in code
  2. Second deploy: remove the column from schema

### 3. Passwords & Auth — Do Not Break Login

- Auth uses `next-auth` with credentials provider and `bcryptjs` for password hashing
- **NEVER** change the password hashing algorithm or rounds without migrating existing hashes
- **NEVER** modify the `passwordHash` column type or constraints
- **NEVER** delete or recreate User records on production — this destroys login access
- If login breaks, check: bcryptjs version, hash format (`$2a$`/`$2b$` prefix), and the credentials authorize callback

### 4. Database Backup Before Risky Operations

Before any migration that modifies existing columns or tables:
- Remind the user to create a Neon DB branch/snapshot first
- Neon dashboard → Branches → Create branch (instant, zero-cost snapshot)

## Running Migrations

Since this project uses Claude Code (not local dev), migrations are run here:

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply a migration (SAFE for additive changes)
npx prisma migrate dev --name descriptive_migration_name

# Check migration status
npx prisma migrate status

# Deploy pending migrations (production-safe, no interactive prompts)
npx prisma migrate deploy
```

**Migration naming convention**: `YYYYMMDD_short_description` (e.g., `20260317_add_teams`)

## Tech Stack Quick Reference

- **Framework**: Next.js 15 (App Router, `src/app/`)
- **ORM**: Prisma (`prisma/schema.prisma`)
- **Database**: PostgreSQL on Neon
- **Auth**: next-auth with credentials + bcryptjs
- **Styling**: Tailwind CSS + Radix UI primitives
- **Deployment**: Vercel (auto-deploys on push to main)
- **File Storage**: AWS S3

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (also runs on Vercel)
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client
npx prisma studio    # Visual DB browser
```

## Pre-Deployment Checklist

Before pushing changes that will auto-deploy:

1. [ ] `npm run build` passes with no errors
2. [ ] No `deleteMany`, `drop`, or `truncate` in migration SQL
3. [ ] All new DB columns are optional (nullable) or have defaults
4. [ ] Auth flow tested — login still works after changes
5. [ ] No `.env` or secrets committed
6. [ ] Migration file created for any schema changes
