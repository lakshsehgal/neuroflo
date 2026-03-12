import { db } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const steps: Record<string, unknown> = {};

  try {
    const { email, password } = await request.json();
    steps.inputReceived = { email, hasPassword: !!password };

    // Step 1: Find user
    const user = await db.user.findUnique({
      where: { email },
    });
    steps.userFound = !!user;
    steps.userActive = user?.isActive ?? null;
    steps.hasHash = !!user?.passwordHash;
    steps.hashLength = user?.passwordHash?.length ?? 0;
    steps.hashPrefix = user?.passwordHash?.substring(0, 7) ?? "none";

    if (!user) {
      return NextResponse.json({ steps, result: "USER_NOT_FOUND" });
    }

    // Step 2: Test bcrypt compare
    try {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      steps.bcryptCompareResult = isValid;
    } catch (bcryptError) {
      steps.bcryptError = String(bcryptError);
      steps.bcryptErrorStack =
        bcryptError instanceof Error ? bcryptError.stack : undefined;
    }

    // Step 3: Check bcrypt module
    steps.bcryptKeys = Object.keys(bcrypt);
    steps.bcryptCompareType = typeof bcrypt.compare;

    return NextResponse.json({ steps, result: "OK" });
  } catch (error) {
    steps.topLevelError = String(error);
    steps.topLevelStack =
      error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ steps, result: "ERROR" }, { status: 500 });
  }
}
