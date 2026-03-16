import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as bcrypt from "bcryptjs";

// GET /api/reset-seed — wipes all users and recreates with fresh password hashes
// DISABLED in production to prevent accidental data loss
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is disabled in production" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!process.env.AUTH_SECRET || secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete all users (cascade will handle related records if set up,
    // otherwise we clean up manually)
    await db.notification.deleteMany();
    await db.notificationPreference.deleteMany();
    await db.pollVote.deleteMany();
    await db.pollOption.deleteMany();
    await db.poll.deleteMany();
    await db.message.deleteMany();
    await db.channelMember.deleteMany();
    await db.channel.deleteMany();
    await db.expense.deleteMany();
    await db.activityLog.deleteMany();
    await db.campaignMetric.deleteMany();
    await db.comment.deleteMany();
    await db.approval.deleteMany();
    await db.revision.deleteMany();
    await db.assetTag.deleteMany();
    await db.assetVersion.deleteMany();
    await db.asset.deleteMany();
    await db.assetFolder.deleteMany();
    await db.ticket.deleteMany();
    await db.checklistItem.deleteMany();
    await db.taskLabel.deleteMany();
    await db.task.deleteMany();
    await db.projectMember.deleteMany();
    await db.project.deleteMany();
    await db.campaign.deleteMany();
    await db.invoice.deleteMany();
    await db.clientOnboarding.deleteMany();
    await db.client.deleteMany();
    await db.invite.deleteMany();
    await db.user.deleteMany();
    await db.department.deleteMany();

    // Recreate departments
    const marketing = await db.department.create({
      data: { name: "Marketing", description: "Marketing and campaigns" },
    });
    const design = await db.department.create({
      data: { name: "Design", description: "Creative and design team" },
    });
    await db.department.create({
      data: { name: "Development", description: "Web and app development" },
    });

    // Recreate users with fresh hashes
    const adminHash = await bcrypt.hash("admin123", 12);
    const memberHash = await bcrypt.hash("member123", 12);

    await db.user.create({
      data: {
        name: "Admin User",
        email: "admin@neuroid.agency",
        passwordHash: adminHash,
        role: "ADMIN",
        departmentId: marketing.id,
      },
    });

    await db.user.create({
      data: {
        name: "Sarah Chen",
        email: "sarah@neuroid.agency",
        passwordHash: memberHash,
        role: "MEMBER",
        departmentId: design.id,
      },
    });

    await db.user.create({
      data: {
        name: "Mike Johnson",
        email: "mike@neuroid.agency",
        passwordHash: memberHash,
        role: "MANAGER",
        departmentId: marketing.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "All users reset. Login: admin@neuroid.agency / admin123",
    });
  } catch (error) {
    console.error("Reset seed error:", error);
    return NextResponse.json(
      { error: "Reset failed", details: String(error) },
      { status: 500 }
    );
  }
}
