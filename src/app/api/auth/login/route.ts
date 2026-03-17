import { NextResponse } from "next/server";

const SESSION_COOKIE = "session-token";

export async function POST(req: Request) {
  console.log("[api/login] Handler started");

  try {
    const { email, password } = await req.json();
    console.log("[api/login] Parsed body for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Dynamic imports to catch module-level errors
    const { default: bcrypt } = await import("bcryptjs");
    console.log("[api/login] bcryptjs loaded");

    const { db } = await import("@/lib/db");
    console.log("[api/login] db loaded");

    const { createSessionToken } = await import("@/lib/auth");
    console.log("[api/login] auth loaded");

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    console.log("[api/login] User found:", !!user);

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password. Please reset your password." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log("[api/login] bcrypt result:", isValid);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Only include avatar if it's a URL (not base64 data)
    const avatar = user.avatar && user.avatar.length < 500 ? user.avatar : null;

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: avatar,
    });
    console.log("[api/login] Token created, length:", token.length);

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    console.log("[api/login] Returning success response");
    return response;
  } catch (err) {
    console.error("[api/login] Error:", String(err));
    console.error("[api/login] Stack:", err instanceof Error ? err.stack : "no stack");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
