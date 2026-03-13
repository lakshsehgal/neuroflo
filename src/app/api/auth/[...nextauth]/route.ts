import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const wantsJson = req.headers.has("X-Auth-Return-Redirect");
  console.log("[auth-route] POST:", req.nextUrl.pathname, "wantsJson:", wantsJson);

  if (!wantsJson) {
    // No special header — just pass through to NextAuth normally
    return handlers.POST(req);
  }

  // Client wants JSON response (from next-auth/react signIn).
  // Read body first, then construct a plain Request without X-Auth-Return-Redirect
  const bodyText = await req.text();
  const plainHeaders = new Headers(req.headers);
  plainHeaders.delete("X-Auth-Return-Redirect");

  const plainReq = new Request(req.url, {
    method: "POST",
    headers: plainHeaders,
    body: bodyText,
  });

  try {
    // Call handlers.POST with a plain Request (not NextRequest)
    // NextAuth will return a 302 redirect since we stripped X-Auth-Return-Redirect
    const response = await handlers.POST(plainReq as unknown as NextRequest);
    const location = response.headers.get("Location");
    console.log("[auth-route] status:", response.status, "location:", location);

    // Build JSON response with cookies from NextAuth but without Location header
    const jsonHeaders = new Headers();
    for (const cookie of response.headers.getSetCookie()) {
      jsonHeaders.append("Set-Cookie", cookie);
    }
    jsonHeaders.set("Content-Type", "application/json");

    if (location) {
      return new Response(JSON.stringify({ url: location }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // If no redirect (shouldn't happen), pass through the body
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: jsonHeaders,
    });
  } catch (error: unknown) {
    console.error("[auth-route] error:", error instanceof Error ? error.message : error);
    const errorUrl = new URL("/login", req.nextUrl.origin);
    errorUrl.searchParams.set("error", "CredentialsSignin");
    return new Response(JSON.stringify({ url: errorUrl.toString() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
