-- AlterTable (add UGC fields to Task)
ALTER TABLE "Task" ADD COLUMN "creatorName" TEXT;
ALTER TABLE "Task" ADD COLUMN "creatorHandle" TEXT;
ALTER TABLE "Task" ADD COLUMN "shootDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Task" ADD COLUMN "thumbnailUrl" TEXT;

-- CreateTable
CREATE TABLE "GuestAccess" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestAccess_token_key" ON "GuestAccess"("token");
CREATE INDEX "GuestAccess_projectId_idx" ON "GuestAccess"("projectId");
CREATE INDEX "GuestAccess_token_idx" ON "GuestAccess"("token");

-- AddForeignKey
ALTER TABLE "GuestAccess" ADD CONSTRAINT "GuestAccess_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestAccess" ADD CONSTRAINT "GuestAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
