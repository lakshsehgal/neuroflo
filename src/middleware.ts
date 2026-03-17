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

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    if (!secret) return false;
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const isLoggedIn = token ? await verifyToken(token) : false;

  // These routes should always be accessible (even when logged in)
  const isAlwaysPublic =
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/onboarding");

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/).*)"],
};
