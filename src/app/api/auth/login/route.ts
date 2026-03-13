import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email as string },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password as string, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create JWT token (same format as NextAuth)
    const secret = process.env.AUTH_SECRET!;
    const isSecure = req.nextUrl.protocol === "https:";

    const token = await encode({
      token: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.avatar,
        sub: user.id,
        roleRefreshedAt: Date.now(),
      },
      secret,
      salt: isSecure
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    });

    // Set the session cookie
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    const response = NextResponse.json({ ok: true, callbackUrl: "/dashboard" });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("[login] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
