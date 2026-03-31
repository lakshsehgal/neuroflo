import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

// One-time endpoint to remove Team Fire & Team Flame.
// DELETE /api/cleanup-teams
export async function DELETE() {
  try {
    await requireRole("ADMIN");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamsToRemove = ["Team Fire", "Team Flame"];
  const results: string[] = [];

  for (const name of teamsToRemove) {
    const team = await db.team.findFirst({
      where: { name },
      include: {
        department: { select: { name: true } },
        _count: { select: { teamTasks: true, members: true } },
      },
    });

    if (!team) {
      results.push(`"${name}" not found — skipped`);
      continue;
    }

    await db.team.delete({ where: { id: team.id } });
    results.push(
      `Deleted "${name}" (dept: ${team.department.name}, tasks: ${team._count.teamTasks}, members: ${team._count.members})`
    );
  }

  return NextResponse.json({ success: true, results });
}
