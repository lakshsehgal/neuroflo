import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const wantsJson = req.headers.has("X-Auth-Return-Redirect");
  console.log("[auth-route] POST:", pathname, "wantsJson:", wantsJson);

  try {
    // Strip X-Auth-Return-Redirect so NextAuth returns a normal redirect
    // We'll convert it to JSON ourselves afterward
    const headers = new Headers(req.headers);
    headers.delete("X-Auth-Return-Redirect");
    const modifiedReq = new NextRequest(req.url, {
      method: req.method,
      headers,
      body: req.body,
      duplex: "half",
    });

    const response = await handlers.POST(modifiedReq);
    const status = response.status;
    const location = response.headers.get("Location");
    console.log("[auth-route] response:", status, "location:", location);

    // If original client wanted JSON (next-auth/react signIn),
    // convert the redirect to a JSON response
    if (wantsJson && location) {
      // Copy Set-Cookie headers but remove Location
      const jsonHeaders = new Headers();
      for (const cookie of response.headers.getSetCookie()) {
        jsonHeaders.append("Set-Cookie", cookie);
      }
      jsonHeaders.set("Content-Type", "application/json");

      return new Response(JSON.stringify({ url: location }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    return response;
  } catch (error: unknown) {
    console.error("[auth-route] error:", error instanceof Error ? error.message : error);

    if (wantsJson) {
      const errorUrl = new URL("/login", req.nextUrl.origin);
      errorUrl.searchParams.set("error", "CredentialsSignin");
      return new Response(JSON.stringify({ url: errorUrl.toString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
