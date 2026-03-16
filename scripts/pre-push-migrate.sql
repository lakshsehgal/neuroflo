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

-- Convert ProjectStatus column to text for enum migration
ALTER TABLE "Project" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN status TYPE TEXT;

-- Map old project statuses to new UGC workflow statuses
UPDATE "Project" SET status = 'RESEARCH' WHERE status = 'PLANNING';
UPDATE "Project" SET status = 'PRODUCTION' WHERE status = 'ACTIVE';
UPDATE "Project" SET status = 'ON_HOLD' WHERE status = 'ON_HOLD';
UPDATE "Project" SET status = 'DELIVERED' WHERE status = 'COMPLETED';
UPDATE "Project" SET status = 'DELIVERED' WHERE status = 'ARCHIVED';

-- Drop old enum type so db push can recreate it cleanly
DROP TYPE IF EXISTS "ProjectStatus";
