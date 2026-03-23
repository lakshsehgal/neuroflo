-- AlterEnum: Add IN_REVISION to TaskStatus
ALTER TYPE "TaskStatus" ADD VALUE 'IN_REVISION';

-- AlterTable: Rename creatorHandle to workPortfolioLink
ALTER TABLE "Task" RENAME COLUMN "creatorHandle" TO "workPortfolioLink";

-- AlterTable: Drop videoUrl (merged into deliveryLink)
ALTER TABLE "Task" DROP COLUMN "videoUrl";

-- CreateTable: InvoicePayment for partial payments
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
