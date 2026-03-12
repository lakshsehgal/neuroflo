-- CreateEnum
CREATE TYPE "TicketFormat" AS ENUM ('STATIC', 'VIDEO', 'UGC', 'GIF', 'CAROUSEL', 'DPA_FRAME');
CREATE TYPE "CreativeType" AS ENUM ('NET_NEW', 'ITERATION');
CREATE TYPE "SentimentStatus" AS ENUM ('HAPPY', 'NEUTRAL', 'AT_RISK', 'CHURNED');
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- Rename TicketStatus values
ALTER TYPE "TicketStatus" RENAME VALUE 'SUBMITTED' TO 'NEW_REQUEST';
ALTER TYPE "TicketStatus" ADD VALUE 'SIZE_CHANGES';
ALTER TYPE "TicketStatus" ADD VALUE 'READY_FOR_APPROVAL';
ALTER TYPE "TicketStatus" ADD VALUE 'SENT_TO_CLIENT';
ALTER TYPE "TicketStatus" ADD VALUE 'NEEDS_EDIT';
ALTER TYPE "TicketStatus" ADD VALUE 'AWAITING_EDITS';
ALTER TYPE "TicketStatus" ADD VALUE 'ON_HOLD';

-- Remove old enum values that are no longer used
-- (IN_REVIEW, REVISION_REQUESTED, COMPLETED will stay as they may have existing data)

-- AlterTable Ticket
ALTER TABLE "Ticket" ADD COLUMN "format" "TicketFormat";
ALTER TABLE "Ticket" ADD COLUMN "creativeType" "CreativeType";
ALTER TABLE "Ticket" ADD COLUMN "clientName" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "creativeBriefUrl" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "deliveryLink" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "assignedById" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Client
ALTER TABLE "Client" ADD COLUMN "sow" TEXT;
ALTER TABLE "Client" ADD COLUMN "sentimentStatus" "SentimentStatus" NOT NULL DEFAULT 'NEUTRAL';
ALTER TABLE "Client" ADD COLUMN "avgBillingAmount" DOUBLE PRECISION;
ALTER TABLE "Client" ADD COLUMN "decidedCommercials" TEXT;
ALTER TABLE "Client" ADD COLUMN "invoicingDueDay" INTEGER;
ALTER TABLE "Client" ADD COLUMN "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3;

-- CreateTable Invoice
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
