import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  console.log("[auth-route] POST invoked:", req.nextUrl.pathname);
  try {
    const response = await handlers.POST(req);
    const status = response.status;
    console.log("[auth-route] response status:", status);

    // If error response, capture full body for debugging
    if (status >= 400) {
      const cloned = response.clone();
      const body = await cloned.text();
      console.error("[auth-route] error body:", body.substring(0, 500));
      // Return as JSON so we can see it in browser
      return NextResponse.json(
        {
          _debug: "response-error",
          status,
          headers: Object.fromEntries(response.headers.entries()),
          body: body.substring(0, 2000),
        },
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
      {
        _debug: "threw",
        name,
        message: msg,
        stack: stack?.split("\n").slice(0, 10),
      },
      { status: 500 }
    );
  }
}
