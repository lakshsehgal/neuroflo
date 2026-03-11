import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create departments
  const design = await prisma.department.upsert({
    where: { name: "Design" },
    update: {},
    create: { name: "Design", description: "Creative and design team" },
  });

  const marketing = await prisma.department.upsert({
    where: { name: "Marketing" },
    update: {},
    create: { name: "Marketing", description: "Marketing and campaigns" },
  });

  const dev = await prisma.department.upsert({
    where: { name: "Development" },
    update: {},
    create: { name: "Development", description: "Web and app development" },
  });

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@neuroid.agency" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@neuroid.agency",
      passwordHash: adminPassword,
      role: "ADMIN",
      departmentId: marketing.id,
    },
  });

  // Create sample users
  const memberPassword = await bcrypt.hash("member123", 12);

  const designer = await prisma.user.upsert({
    where: { email: "sarah@neuroid.agency" },
    update: {},
    create: {
      name: "Sarah Chen",
      email: "sarah@neuroid.agency",
      passwordHash: memberPassword,
      role: "MEMBER",
      departmentId: design.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "mike@neuroid.agency" },
    update: {},
    create: {
      name: "Mike Johnson",
      email: "mike@neuroid.agency",
      passwordHash: memberPassword,
      role: "MANAGER",
      departmentId: marketing.id,
    },
  });

  // Create a sample client
  const client = await prisma.client.upsert({
    where: { id: "sample-client-1" },
    update: {},
    create: {
      id: "sample-client-1",
      name: "Acme Corp",
      industry: "Technology",
      contactName: "Jane Smith",
      contactEmail: "jane@acme.com",
      website: "https://acme.com",
    },
  });

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: "sample-project-1" },
    update: {},
    create: {
      id: "sample-project-1",
      name: "Q1 Brand Refresh",
      description: "Complete brand identity refresh for Acme Corp including logo, colors, and marketing materials",
      status: "ACTIVE",
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

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      { projectId: project.id, title: "Research competitor brands", status: "DONE", priority: "HIGH", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Create mood board", status: "DONE", priority: "MEDIUM", assigneeId: designer.id, order: 1 },
      { projectId: project.id, title: "Design logo concepts", status: "IN_PROGRESS", priority: "HIGH", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Define color palette", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: designer.id, order: 1 },
      { projectId: project.id, title: "Create brand guidelines doc", status: "TODO", priority: "MEDIUM", assigneeId: designer.id, order: 0 },
      { projectId: project.id, title: "Design business cards", status: "TODO", priority: "LOW", assigneeId: designer.id, order: 1 },
      { projectId: project.id, title: "Update social media templates", status: "TODO", priority: "MEDIUM", order: 2 },
    ],
    skipDuplicates: true,
  });

  // Create sample ticket
  await prisma.ticket.upsert({
    where: { id: "sample-ticket-1" },
    update: {},
    create: {
      id: "sample-ticket-1",
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

  // Create sample campaign
  const campaign = await prisma.campaign.upsert({
    where: { id: "sample-campaign-1" },
    update: {},
    create: {
      id: "sample-campaign-1",
      clientId: client.id,
      name: "Q1 Digital Ads",
      status: "ACTIVE",
      platform: "Google Ads",
      budget: 15000,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    },
  });

  // Add sample metrics
  const metricDates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date("2026-01-01");
    d.setDate(d.getDate() + i * 7);
    return d;
  });

  for (const date of metricDates) {
    await prisma.campaignMetric.create({
      data: { campaignId: campaign.id, name: "Impressions", value: Math.floor(Math.random() * 50000) + 10000, date },
    });
    await prisma.campaignMetric.create({
      data: { campaignId: campaign.id, name: "Clicks", value: Math.floor(Math.random() * 3000) + 500, date },
    });
    await prisma.campaignMetric.create({
      data: { campaignId: campaign.id, name: "Conversions", value: Math.floor(Math.random() * 200) + 20, date },
    });
  }

  // Create activity logs
  await prisma.activityLog.createMany({
    data: [
      { userId: admin.id, action: "CREATED", entityType: "PROJECT", entityId: project.id, metadata: { name: "Q1 Brand Refresh" } },
      { userId: manager.id, action: "CREATED", entityType: "TICKET", entityId: "sample-ticket-1", metadata: { title: "Homepage Hero Banner Design" } },
      { userId: designer.id, action: "STATUS_CHANGED", entityType: "TASK", entityId: "task-1", metadata: { from: "TODO", to: "IN_PROGRESS" } },
    ],
  });

  console.log("Seed complete!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Admin: admin@neuroid.agency / admin123");
  console.log("  Manager: mike@neuroid.agency / member123");
  console.log("  Designer: sarah@neuroid.agency / member123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
