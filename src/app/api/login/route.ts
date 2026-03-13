import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Dynamic imports to avoid module-level crashes
    let db, bcrypt, encode;
    try {
      const dbModule = await import("@/lib/db");
      db = dbModule.db;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[login] db import failed:", msg);
      return NextResponse.json({ error: "DB init failed: " + msg }, { status: 500 });
    }

    try {
      bcrypt = await import("bcryptjs");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[login] bcryptjs import failed:", msg);
      return NextResponse.json({ error: "bcrypt init failed: " + msg }, { status: 500 });
    }

    try {
      const jwtModule = await import("next-auth/jwt");
      encode = jwtModule.encode;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[login] next-auth/jwt import failed:", msg);
      return NextResponse.json({ error: "jwt init failed: " + msg }, { status: 500 });
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.stack || error.message : String(error);
    console.error("[login] error:", msg);
    return NextResponse.json(
      { error: "Internal server error: " + msg },
      { status: 500 }
    );
  }
}
