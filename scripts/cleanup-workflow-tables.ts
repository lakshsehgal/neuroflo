import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  try {
    // Drop leftover sentinel table from earlier attempt (harmless if it doesn't exist).
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "_workflow_cleanup_done" CASCADE`);

    // Check if the Workflow table has the correct schema (the `triggerType` column).
    // If the column doesn't exist, the table is in a partial/broken state from a
    // failed deploy — drop the 3 workflow tables so db push can recreate them cleanly.
    // If the column exists, the schema is good — leave everything alone.
    const result = await db.$queryRawUnsafe<{ has_column: boolean }[]>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Workflow'
          AND column_name = 'triggerType'
      ) as has_column`
    );

    const hasCorrectSchema = result[0]?.has_column === true;

    if (hasCorrectSchema) {
      console.log("[cleanup] Workflow schema is valid, skipping.");
      return;
    }

    console.log("[cleanup] Workflow tables are in partial state, dropping…");
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "WorkflowLog" CASCADE`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "Workflow" CASCADE`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "SlackWebhook" CASCADE`);
    console.log("[cleanup] Done. db push will recreate tables cleanly.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[cleanup] Failed:", e);
  process.exit(1);
});
