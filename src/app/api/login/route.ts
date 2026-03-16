import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Step 1: Can we even reach this handler?
  console.log("[login] handler reached");

  try {
    const body = await req.json();
    console.log("[login] body parsed, email:", body.email);

    // Step 2: Test dynamic imports one by one
    const results: Record<string, string> = {};

    try {
      await import("bcryptjs");
      results.bcryptjs = "ok";
    } catch (e: unknown) {
      results.bcryptjs = e instanceof Error ? e.message : String(e);
    }

    try {
      await import("next-auth/jwt");
      results.nextAuthJwt = "ok";
    } catch (e: unknown) {
      results.nextAuthJwt = e instanceof Error ? e.message : String(e);
    }

    try {
      await import("@/lib/db");
      results.db = "ok";
    } catch (e: unknown) {
      results.db = e instanceof Error ? e.message : String(e);
    }

    console.log("[login] import results:", JSON.stringify(results));

    // If all imports work, try the actual login
    if (results.bcryptjs === "ok" && results.nextAuthJwt === "ok" && results.db === "ok") {
      const { db } = await import("@/lib/db");
      const bcrypt = await import("bcryptjs");
      const { encode } = await import("next-auth/jwt");

      const user = await db.user.findUnique({
        where: { email: body.email as string },
      });

      if (!user || !user.isActive) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const isValid = await bcrypt.compare(body.password as string, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

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
        salt: isSecure ? "__Secure-authjs.session-token" : "authjs.session-token",
      });

      const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
      const response = NextResponse.json({ ok: true, callbackUrl: "/dashboard" });
      response.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    // Return diagnostic info
    return NextResponse.json({ error: "Import failures", details: results }, { status: 500 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.stack || error.message : String(error);
    console.error("[login] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "login endpoint alive", time: new Date().toISOString() });
}
