import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

const originalPost = handlers.POST;

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  try {
    return await originalPost(req);
  } catch (error) {
    console.error("[nextauth-route] POST error:", error);
    console.error(
      "[nextauth-route] Error details:",
      JSON.stringify({
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
      })
    );
    return Response.json(
      { error: "Internal auth error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
