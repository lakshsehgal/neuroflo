/**
 * One-time script to remove Team Fire & Team Flame from the Performance department.
 * This cascades to delete their TeamMembers and TeamTasks.
 *
 * Usage: npx tsx scripts/remove-teams.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teamsToRemove = ["Team Fire", "Team Flame"];

  for (const name of teamsToRemove) {
    const team = await prisma.team.findFirst({
      where: { name },
      include: {
        department: { select: { name: true } },
        _count: { select: { teamTasks: true, members: true } },
      },
    });

    if (!team) {
      console.log(`Team "${name}" not found — skipping.`);
      continue;
    }

    console.log(
      `Deleting "${name}" (dept: ${team.department.name}, tasks: ${team._count.teamTasks}, members: ${team._count.members})...`
    );

    await prisma.team.delete({ where: { id: team.id } });
    console.log(`  ✓ Deleted "${name}"`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
