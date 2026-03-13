import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  try {
    const res = await handlers.POST(req);
    if (res.status >= 400) {
      const body = await res.clone().text();
      // Return the error details so we can see them
      return new Response(
        JSON.stringify({ _debug: true, status: res.status, body }),
        { status: res.status, headers: { "content-type": "application/json" } }
      );
    }
    return res;
  } catch (error) {
    return new Response(
      JSON.stringify({
        _debug: true,
        threw: true,
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
