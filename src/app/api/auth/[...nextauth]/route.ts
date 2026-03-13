import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  console.log("[auth-route] POST invoked:", req.nextUrl.pathname);

  // TEST 1: Does a hardcoded response work from this catch-all route?
  // If this also returns HTML 500, the issue is Next.js catch-all + POST
  // If this returns JSON, the issue is inside handlers.POST
  const testMode = req.nextUrl.searchParams.get("test");
  if (testMode === "ping") {
    return NextResponse.json({ ping: "pong", path: req.nextUrl.pathname });
  }

  try {
    const response = await handlers.POST(req);
    const status = response.status;
    const contentType = response.headers.get("content-type") || "";
    console.log("[auth-route] status:", status, "ct:", contentType);

    if (status >= 400) {
      const body = await response.clone().text();
      console.error("[auth-route] error body:", body.substring(0, 500));
      return NextResponse.json(
        { _debug: "response-error", status, contentType, body: body.substring(0, 2000) },
        { status }
      );
    }
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : typeof error;
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[auth-route] THREW:", name, msg);
    console.error("[auth-route] stack:", stack?.substring(0, 500));
    return NextResponse.json(
      { _debug: "threw", name, message: msg, stack: stack?.split("\n").slice(0, 10) },
      { status: 500 }
    );
  }
}
