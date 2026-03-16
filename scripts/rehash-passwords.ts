/**
 * Safe password rehash migration.
 *
 * Checks whether bcryptjs v3 can verify the known seed-user passwords.
 * If a hash is broken (old bcryptjs v2 format), it re-hashes ONLY that
 * user's password in-place — no data is deleted, no rows are dropped.
 *
 * For real (non-seed) users whose plaintext passwords are unknown, the
 * script cannot re-hash — it logs a warning so an admin can trigger a
 * password-reset flow for those users.
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Known seed-user credentials (only these can be auto-fixed)
const SEED_USERS: Record<string, string> = {
  "admin@neuroid.agency": "admin123",
  "sarah@neuroid.agency": "member123",
  "mike@neuroid.agency": "member123",
};

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true },
  });

  console.log(`Found ${users.length} user(s). Checking password hashes...`);

  let fixed = 0;
  let broken = 0;

  for (const user of users) {
    const knownPassword = SEED_USERS[user.email];

    if (knownPassword) {
      // Seed user — we know the plaintext, so we can verify & fix
      try {
        const ok = await bcrypt.compare(knownPassword, user.passwordHash);
        if (ok) {
          console.log(`  ✓ ${user.email} — hash is valid`);
          continue;
        }
      } catch {
        // compare itself threw — hash format is incompatible
      }

      console.log(`  ✗ ${user.email} — hash broken, re-hashing...`);
      const newHash = await bcrypt.hash(knownPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
      fixed++;
    } else {
      // Real user — we don't know their password, just test if hash parses
      try {
        // Use a dummy compare to see if the hash format is readable
        await bcrypt.compare("probe", user.passwordHash);
        console.log(`  ✓ ${user.email} — hash format OK`);
      } catch {
        console.warn(
          `  ⚠ ${user.email} — hash format unreadable. ` +
            `This user will need to reset their password.`
        );
        broken++;
      }
    }
  }

  console.log("");
  console.log(`Done. Fixed: ${fixed}, Unrecoverable: ${broken}`);
  if (broken > 0) {
    console.log(
      "Unrecoverable users have incompatible hashes and must reset their password."
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
