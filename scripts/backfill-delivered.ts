/**
 * Safe backfill for Ticket.deliveredAt / deliveredById.
 *
 * This project deploys with `prisma db push`, which adds the new columns but
 * does NOT run migration SQL. So existing tickets that already reached a
 * delivered status ("Ready for Approval" or later) would have NULL delivery
 * fields and would not show up in the "delivered by editor" accountability.
 *
 * This script fills those NULLs ONCE, using updatedAt as the best-known
 * estimate of when delivery happened and the current assignee as the
 * best-known editor. It is fully idempotent: it only ever touches rows whose
 * deliveredAt is still NULL, never deletes or overwrites existing data, and
 * is a no-op on every run after the first.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Column-to-column assignment isn't expressible via updateMany, so use raw
  // SQL. Cast the enum to text so the literal comparison is unambiguous.
  const affected = await prisma.$executeRawUnsafe(`
    UPDATE "Ticket"
    SET "deliveredAt" = "updatedAt",
        "deliveredById" = "assigneeId"
    WHERE "deliveredAt" IS NULL
      AND "status"::text IN (
        'READY_FOR_APPROVAL',
        'SENT_TO_CLIENT',
        'NEEDS_EDIT',
        'APPROVED',
        'AWAITING_EDITS'
      )
  `);

  console.log(`Backfilled deliveredAt/deliveredById for ${affected} ticket(s).`);
}

main()
  .catch((e) => {
    console.error("Delivered backfill failed (non-fatal):", e);
    process.exitCode = 0; // never break the build over the backfill
  })
  .finally(() => prisma.$disconnect());
