-- AlterTable
ALTER TABLE "Client" ADD COLUMN "engagementStartDate" TIMESTAMP(3);

-- Backfill: set engagementStartDate to createdAt for existing clients
UPDATE "Client" SET "engagementStartDate" = "createdAt" WHERE "engagementStartDate" IS NULL;
