import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting and seeding database...");

  // ── Nuke all existing data (order matters for FK constraints) ──
  console.log("Clearing existing data...");
  await prisma.campaignMetric.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channelMember.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.assetTag.deleteMany();
  await prisma.assetVersion.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetFolder.deleteMany();
  await prisma.teamTask.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.revision.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.clientOnboarding.deleteMany();
  await prisma.client.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  console.log("All data cleared.");

  // ── Departments ──
  const performance = await prisma.department.create({
    data: { name: "Performance", description: "Performance marketing department" },
  });

  const creative = await prisma.department.create({
    data: { name: "Creative", description: "Creative and design department" },
  });

  const operations = await prisma.department.create({
    data: { name: "Operations", description: "Operations and admin" },
  });

  // Keep legacy aliases for backward compat in seed
  const design = creative;
  const marketing = performance;

  // ── Teams ──
  const teamFlame = await prisma.team.create({
    data: { name: "Team Flame", departmentId: performance.id },
  });

  const teamFire = await prisma.team.create({
    data: { name: "Team Fire", departmentId: performance.id },
  });

  const teamCreative = await prisma.team.create({
    data: { name: "Team Creative", departmentId: creative.id },
  });

  // ── Users (fresh hashes) ──
  const adminHash = await bcrypt.hash("admin123", 12);
  const memberHash = await bcrypt.hash("member123", 12);

  // Verify hashes work before inserting
  const adminVerify = await bcrypt.compare("admin123", adminHash);
  const memberVerify = await bcrypt.compare("member123", memberHash);
  console.log(`Hash verification — admin: ${adminVerify}, member: ${memberVerify}`);

  if (!adminVerify || !memberVerify) {
    throw new Error("bcryptjs hash verification FAILED — aborting seed");
  }

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@neuroid.agency",
      passwordHash: adminHash,
      role: "ADMIN",
      departmentId: marketing.id,
    },
  });

  const designer = await prisma.user.create({
    data: {
      name: "Sarah Chen",
      email: "sarah@neuroid.agency",
      passwordHash: memberHash,
      role: "MEMBER",
      departmentId: design.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Mike Johnson",
      email: "mike@neuroid.agency",
      passwordHash: memberHash,
      role: "MANAGER",
      departmentId: marketing.id,
    },
  });

  // ── Sample data ──
  const client = await prisma.client.create({
    data: {
      name: "Acme Corp",
      industry: "Technology",
      contactName: "Jane Smith",
      contactEmail: "jane@acme.com",
      website: "https://acme.com",
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Q1 Brand Refresh",
      description: "Complete brand identity refresh for Acme Corp including logo, colors, and marketing materials",
      clientId: client.id,
      departmentId: design.id,
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-03-31"),
      members: {
        create: [
          { userId: admin.id, role: "LEAD" },
          { userId: designer.id, role: "MEMBER" },
          { userId: manager.id, role: "MEMBER" },
        ],
      },
    },
  });

  await prisma.task.createMany({
    data: [
      { projectId: project.id, title: "Research competitor brands", status: "DELIVERED", priority: "HIGH", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Create mood board", status: "MOODBOARDING", priority: "MEDIUM", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Design logo concepts", status: "PRODUCTION", priority: "HIGH", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Define color palette", status: "SCRIPTING", priority: "MEDIUM", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Create brand guidelines doc", status: "RESEARCH", priority: "MEDIUM", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Design business cards", status: "RESEARCH", priority: "LOW", assigneeId: designer.id, order: 1 },
      { projectId: project.id, title: "Update social media templates", status: "ANGLES", priority: "MEDIUM", order: 0 },
    ],
  });

  await prisma.ticket.create({
    data: {
      title: "Homepage Hero Banner Design",
      description: "Need a new hero banner for the Acme Corp website homepage. Should incorporate the new brand colors and logo.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project.id,
      creatorId: manager.id,
      assigneeId: designer.id,
      dueDate: new Date("2026-03-20"),
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      clientId: client.id,
      name: "Q1 Digital Ads",
      status: "ACTIVE",
      platform: "Google Ads",
      budget: 15000,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    },
  });

  const metricDates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date("2026-01-01");
    d.setDate(d.getDate() + i * 7);
    return d;
  });

  for (const date of metricDates) {
    await prisma.campaignMetric.createMany({
      data: [
        { campaignId: campaign.id, name: "Impressions", value: Math.floor(Math.random() * 50000) + 10000, date },
        { campaignId: campaign.id, name: "Clicks", value: Math.floor(Math.random() * 3000) + 500, date },
        { campaignId: campaign.id, name: "Conversions", value: Math.floor(Math.random() * 200) + 20, date },
      ],
    });
  }

  await prisma.activityLog.createMany({
    data: [
      { userId: admin.id, action: "CREATED", entityType: "PROJECT", entityId: project.id, metadata: { name: "Q1 Brand Refresh" } },
      { userId: manager.id, action: "CREATED", entityType: "TICKET", entityId: "sample-ticket-1", metadata: { title: "Homepage Hero Banner Design" } },
      { userId: designer.id, action: "STATUS_CHANGED", entityType: "TASK", entityId: "task-1", metadata: { from: "TODO", to: "IN_PROGRESS" } },
    ],
  });

  // ── Create a general chat channel ──
  const generalChannel = await prisma.channel.create({
    data: {
      name: "general",
      description: "General discussion",
      createdById: admin.id,
    },
  });

  await prisma.channelMember.createMany({
    data: [
      { channelId: generalChannel.id, userId: admin.id },
      { channelId: generalChannel.id, userId: designer.id },
      { channelId: generalChannel.id, userId: manager.id },
    ],
  });

  // ── Team Members ──
  await prisma.teamMember.createMany({
    data: [
      { teamId: teamFlame.id, userId: manager.id, role: "LEAD" },
      { teamId: teamFire.id, userId: admin.id, role: "LEAD" },
      { teamId: teamCreative.id, userId: designer.id, role: "LEAD" },
    ],
  });

  // ── Sample Team Tasks ──
  await prisma.teamTask.createMany({
    data: [
      { teamId: teamFlame.id, title: "Optimize Meta ad sets for Q2", status: "IN_PROGRESS", priority: "HIGH", assigneeId: manager.id, createdById: admin.id, order: 0 },
      { teamId: teamFlame.id, title: "Prepare weekly performance report", status: "TODO", priority: "MEDIUM", assigneeId: manager.id, createdById: admin.id, order: 1 },
      { teamId: teamFlame.id, title: "A/B test landing page variants", status: "IN_REVIEW", priority: "HIGH", createdById: admin.id, order: 2 },
      { teamId: teamFire.id, title: "Google Ads campaign setup - Acme Corp", status: "IN_PROGRESS", priority: "URGENT", assigneeId: admin.id, createdById: admin.id, order: 0 },
      { teamId: teamFire.id, title: "Audit conversion tracking pixels", status: "TODO", priority: "MEDIUM", createdById: admin.id, order: 1 },
      { teamId: teamFire.id, title: "Client reporting deck - March", status: "BLOCKED", priority: "HIGH", createdById: manager.id, order: 2 },
      { teamId: teamCreative.id, title: "Design social media templates for Q2", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: designer.id, createdById: admin.id, order: 0 },
      { teamId: teamCreative.id, title: "UGC brief for summer campaign", status: "TODO", priority: "HIGH", createdById: manager.id, order: 1 },
      { teamId: teamCreative.id, title: "Brand guideline update - Acme", status: "DONE", priority: "LOW", assigneeId: designer.id, createdById: admin.id, order: 2 },
    ],
  });

  console.log("");
  console.log("Seed complete! All users reset with fresh password hashes.");
  console.log("");
  console.log("Login credentials:");
  console.log("  Admin:    admin@neuroid.agency / admin123");
  console.log("  Manager:  mike@neuroid.agency  / member123");
  console.log("  Designer: sarah@neuroid.agency / member123");
  console.log("");
  console.log("Teams created:");
  console.log("  Team Flame  → Performance");
  console.log("  Team Fire   → Performance");
  console.log("  Team Creative → Creative");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
