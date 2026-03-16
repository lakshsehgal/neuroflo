-- AlterTable
ALTER TABLE "ClientOnboarding" ADD COLUMN "metaCatalogueAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "metaPixelAccess" BOOLEAN NOT NULL DEFAULT false;
