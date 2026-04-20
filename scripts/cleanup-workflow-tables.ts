import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  try {
    // Check if cleanup has already been done (sentinel table)
    const sentinel = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = '_workflow_cleanup_done'
      ) as exists`
    );

    if (sentinel[0]?.exists) {
      console.log("[cleanup] Workflow cleanup already done, skipping.");
      return;
    }

    // Drop partially-created workflow tables from failed deploy.
    // Safe because these are brand-new tables with no data.
    console.log("[cleanup] Dropping partial workflow tables…");
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "WorkflowLog" CASCADE`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "Workflow" CASCADE`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "SlackWebhook" CASCADE`);

    // Create sentinel so this never runs again on future deploys
    await db.$executeRawUnsafe(
      `CREATE TABLE "_workflow_cleanup_done" (ran_at TIMESTAMP DEFAULT NOW())`
    );
    await db.$executeRawUnsafe(
      `INSERT INTO "_workflow_cleanup_done" DEFAULT VALUES`
    );

    console.log("[cleanup] Done. db push will recreate tables cleanly.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[cleanup] Failed:", e);
  process.exit(1);
});
