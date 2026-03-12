import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Import dynamically to catch module load errors
    let db, bcrypt, signIn, AuthError;
    try {
      const dbMod = await import("@/lib/db");
      db = dbMod.db;
      console.log("[login] db imported OK");
    } catch (e) {
      console.error("[login] db import failed:", e);
      return NextResponse.json({ error: "DB module failed to load" }, { status: 500 });
    }

    try {
      bcrypt = await import("bcryptjs");
      console.log("[login] bcryptjs imported OK");
    } catch (e) {
      console.error("[login] bcryptjs import failed:", e);
      return NextResponse.json({ error: "bcrypt module failed to load" }, { status: 500 });
    }

    try {
      const authMod = await import("@/lib/auth");
      signIn = authMod.signIn;
      console.log("[login] auth imported OK");
    } catch (e) {
      console.error("[login] auth import failed:", e);
      return NextResponse.json({ error: "Auth module failed to load" }, { status: 500 });
    }

    try {
      const nextAuthMod = await import("next-auth");
      AuthError = nextAuthMod.AuthError;
      console.log("[login] next-auth imported OK");
    } catch (e) {
      console.error("[login] next-auth import failed:", e);
      return NextResponse.json({ error: "next-auth module failed to load" }, { status: 500 });
    }

    // Try signing in
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      console.error("[login] signIn error:", error);
      return NextResponse.json(
        { error: "Authentication failed. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[login] Top-level error:", error);
    return NextResponse.json({ error: "Request processing failed" }, { status: 500 });
  }
}
