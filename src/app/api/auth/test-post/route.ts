import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("[test-post] handler invoked");
  try {
    const body = await req.text();
    console.log("[test-post] body length:", body.length);
    return NextResponse.json({ ok: true, bodyLength: body.length });
  } catch (error: unknown) {
    console.error("[test-post] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
