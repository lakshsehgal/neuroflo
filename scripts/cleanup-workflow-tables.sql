-- Run this ONCE on your Neon database to clean up partially-created workflow tables
-- from a failed deploy. Safe because these tables are brand new and empty.
-- After running, redeploy and prisma db push will recreate them cleanly.

DROP TABLE IF EXISTS "WorkflowLog" CASCADE;
DROP TABLE IF EXISTS "Workflow" CASCADE;
DROP TABLE IF EXISTS "SlackWebhook" CASCADE;
