-- AlterTable
ALTER TABLE "Client" ADD COLUMN "primaryPerformanceOwnerId" TEXT;
ALTER TABLE "Client" ADD COLUMN "secondaryPerformanceOwnerId" TEXT;
ALTER TABLE "Client" ADD COLUMN "creativeStrategyOwnerId" TEXT;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_primaryPerformanceOwnerId_fkey" FOREIGN KEY ("primaryPerformanceOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_secondaryPerformanceOwnerId_fkey" FOREIGN KEY ("secondaryPerformanceOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_creativeStrategyOwnerId_fkey" FOREIGN KEY ("creativeStrategyOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
