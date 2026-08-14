import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Auth gate for protected app routes only.
 * /login and /register are excluded from the matcher so they never participate
 * in redirect decisions (avoids ERR_TOO_MANY_REDIRECTS when a JWT exists but
 * the user has no tenant membership).
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect app pages; skip auth pages, health, Next internals and static assets.
     */
    "/((?!login|register|api/health|_next/static|_next/image|favicon.ico|favicon.svg|icon.svg).*)",
  ],
};
