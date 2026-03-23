-- AlterTable: Add GST rate to Invoice (default 18%)
ALTER TABLE "Invoice" ADD COLUMN "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 18;

-- AlterTable: Add delivery fields to Task
ALTER TABLE "Task" ADD COLUMN "deliveryLink" TEXT;
ALTER TABLE "Task" ADD COLUMN "estimatedDeliveryDate" TIMESTAMP(3);

-- CreateTable: TaskRevision for UGC video versioning
CREATE TABLE "TaskRevision" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaskFeedback for client feedback on revisions
CREATE TABLE "TaskFeedback" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "revisionId" TEXT,
    "content" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "isClient" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskRevision_taskId_idx" ON "TaskRevision"("taskId");
CREATE INDEX "TaskFeedback_taskId_idx" ON "TaskFeedback"("taskId");
CREATE INDEX "TaskFeedback_revisionId_idx" ON "TaskFeedback"("revisionId");

-- AddForeignKey
ALTER TABLE "TaskRevision" ADD CONSTRAINT "TaskRevision_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskFeedback" ADD CONSTRAINT "TaskFeedback_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskFeedback" ADD CONSTRAINT "TaskFeedback_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "TaskRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
