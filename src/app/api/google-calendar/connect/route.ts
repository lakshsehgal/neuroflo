import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    // Redirect back to dashboard with a message instead of showing a JSON error
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=not_configured", req.url)
    );
  }

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
