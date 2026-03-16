-- AlterTable
ALTER TABLE "Client" ADD COLUMN "oneTimeProjectAmount" DOUBLE PRECISION;
ALTER TABLE "Client" ADD COLUMN "onboardingToken" TEXT;
ALTER TABLE "Client" ADD COLUMN "onboardingsentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Client_onboardingToken_key" ON "Client"("onboardingToken");

-- CreateTable
CREATE TABLE "ClientOnboarding" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "authorisedSignatory" TEXT,
    "gstin" TEXT,
    "legalCompanyName" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientOnboarding_clientId_key" ON "ClientOnboarding"("clientId");

-- AddForeignKey
ALTER TABLE "ClientOnboarding" ADD CONSTRAINT "ClientOnboarding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
