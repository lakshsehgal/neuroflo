-- Add new fields to ClientOnboarding for enhanced onboarding
ALTER TABLE "ClientOnboarding" ADD COLUMN "shopifyCollaboratorCode" TEXT;
ALTER TABLE "ClientOnboarding" ADD COLUMN "googleAdAccountId" TEXT;
ALTER TABLE "ClientOnboarding" ADD COLUMN "gstCertificateUrl" TEXT;

-- Accesses checklist fields
ALTER TABLE "ClientOnboarding" ADD COLUMN "metaBmId" TEXT;
ALTER TABLE "ClientOnboarding" ADD COLUMN "metaPageAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "metaAdAccountAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "googleAdsAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "googleAnalyticsAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "googleSearchConsole" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "shopifyAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "websiteAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOnboarding" ADD COLUMN "otherAccesses" TEXT;
