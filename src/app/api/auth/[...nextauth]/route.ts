import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  console.log("[auth-route] POST handler invoked", req.nextUrl.pathname);
  try {
    const response = await handlers.POST(req);
    console.log("[auth-route] POST handler response status:", response.status);
    return response;
  } catch (error: unknown) {
    console.error("[auth-route] POST handler threw:", error);
    return NextResponse.json(
      {
        error: "auth-route-catch",
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 8) : undefined,
      },
      { status: 500 }
    );
  }
}
