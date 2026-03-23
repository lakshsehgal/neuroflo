import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session-token";

let _secret: Uint8Array | null = null;
function getSecret(): Uint8Array | null {
  if (!_secret) {
    const raw = process.env.AUTH_SECRET;
    if (!raw) return null;
    _secret = new TextEncoder().encode(raw);
  }
  return _secret;
}

async function verifyToken(token: string): Promise<{ valid: boolean; role?: string }> {
  try {
    const secret = getSecret();
    if (!secret) return { valid: false };
    const { payload } = await jwtVerify(token, secret);
    return { valid: true, role: payload.role as string | undefined };
  } catch {
    return { valid: false };
  }
}

// Routes that CONTRACTOR role is allowed to access (dashboard routes only)
const CONTRACTOR_ALLOWED_PREFIXES = ["/tickets", "/settings/profile", "/settings/notifications"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const result = token ? await verifyToken(token) : { valid: false };
  const isLoggedIn = result.valid;

  // These routes should always be accessible (even when logged in)
  const isAlwaysPublic =
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/guest");

  if (isAlwaysPublic) {
    return NextResponse.next();
  }

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/accept-invite") ||
    pathname.startsWith("/forgot-password");

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // CONTRACTOR route restriction: only allow Creative Tickets and Account pages
  if (result.role === "CONTRACTOR") {
    const isAllowed = CONTRACTOR_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/tickets", req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/).*)"],
};
