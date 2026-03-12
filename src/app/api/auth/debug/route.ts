import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userCount = await db.user.count();
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    return NextResponse.json({
      totalUsers: userCount,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        hasPasswordHash: !!u.passwordHash,
        hashLength: u.passwordHash?.length ?? 0,
        hashPrefix: u.passwordHash?.substring(0, 7) ?? "none",
      })),
    });
  } catch (error) {
    console.error("[debug] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
