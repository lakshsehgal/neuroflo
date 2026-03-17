-- AlterTable
ALTER TABLE "Client" ADD COLUMN "mandates" TEXT[] DEFAULT ARRAY[]::TEXT[];
