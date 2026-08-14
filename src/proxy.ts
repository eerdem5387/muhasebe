import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, ACTIVE_TENANT_COOKIE, verifySessionToken } from "@/lib/auth";

function loginRedirect(req: NextRequest, clearCookies = false) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (req.nextUrl.pathname !== "/login") {
    url.searchParams.set("next", req.nextUrl.pathname);
  }
  const res = NextResponse.redirect(url);
  if (clearCookies) {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(ACTIVE_TENANT_COOKIE);
  }
  return res;
}

/**
 * Auth gate for protected app routes only.
 * Cookie clearing happens on the response (allowed here). Never mutate cookies
 * inside a Server Component render — that crashes production RSC.
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return loginRedirect(req);

  const session = await verifySessionToken(token);
  if (!session) return loginRedirect(req, true);

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|register|api/health|api/auth|_next/static|_next/image|favicon.ico|favicon.svg|icon.svg).*)",
  ],
};
