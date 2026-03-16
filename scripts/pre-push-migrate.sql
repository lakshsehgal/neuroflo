-- Convert TicketStatus column to text to avoid enum constraint issues during schema push
ALTER TABLE "Ticket" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN status TYPE TEXT;

-- Map old enum values to new ones
UPDATE "Ticket" SET status = 'NEW_REQUEST' WHERE status = 'SUBMITTED';
UPDATE "Ticket" SET status = 'APPROVED' WHERE status = 'COMPLETED';
UPDATE "Ticket" SET status = 'READY_FOR_APPROVAL' WHERE status = 'IN_REVIEW';
UPDATE "Ticket" SET status = 'NEEDS_EDIT' WHERE status = 'REVISION_REQUESTED';

-- Drop old enum type so db push can recreate it cleanly
DROP TYPE IF EXISTS "TicketStatus";

-- Drop Project status column (status is now on tasks, not projects)
ALTER TABLE "Project" DROP COLUMN IF EXISTS status;

-- Drop old ProjectStatus enum type
DROP TYPE IF EXISTS "ProjectStatus";

-- Convert TaskStatus column to text for enum migration
ALTER TABLE "Task" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN status TYPE TEXT;

-- Map old task statuses to new UGC workflow statuses
UPDATE "Task" SET status = 'RESEARCH' WHERE status = 'TODO';
UPDATE "Task" SET status = 'PRODUCTION' WHERE status = 'IN_PROGRESS';
UPDATE "Task" SET status = 'APPROVAL_PENDING' WHERE status = 'IN_REVIEW';
UPDATE "Task" SET status = 'DELIVERED' WHERE status = 'DONE';

-- Drop old enum type so db push can recreate it cleanly
DROP TYPE IF EXISTS "TaskStatus";
