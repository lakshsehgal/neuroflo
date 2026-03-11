import { NextRequest, NextResponse } from "next/server";
import { acceptInvite } from "@/actions/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await acceptInvite(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
