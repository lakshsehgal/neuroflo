import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

const originalPost = handlers.POST;

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  try {
    const res = await originalPost(req);
    if (res.status >= 400) {
      const cloned = res.clone();
      const body = await cloned.text();
      console.error(`[nextauth-route] POST returned ${res.status}:`, body);
    }
    return res;
  } catch (error) {
    console.error("[nextauth-route] POST threw:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
