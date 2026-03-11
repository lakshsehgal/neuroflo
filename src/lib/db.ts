import { PrismaClient } from "@prisma/client";

function cleanDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: cleanDatabaseUrl(process.env.DATABASE_URL),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
