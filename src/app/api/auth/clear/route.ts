import { NextResponse } from "next/server";
import { ACTIVE_TENANT_COOKIE, SESSION_COOKIE } from "@/lib/auth";

/** Clears stale session cookies then sends the browser to /login. */
export async function GET(req: Request) {
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(ACTIVE_TENANT_COOKIE);
  return res;
}
