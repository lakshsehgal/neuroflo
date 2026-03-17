import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-calendar";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?calendar_error=no_code", req.url));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    await db.user.update({
      where: { id: session.id },
      data: {
        googleAccessToken: tokens.access_token || null,
        googleRefreshToken: tokens.refresh_token || null,
        googleCalendarConnected: true,
      },
    });

    return NextResponse.redirect(new URL("/dashboard?calendar_connected=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?calendar_error=auth_failed", req.url));
  }
}
