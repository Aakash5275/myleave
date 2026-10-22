import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, homeFor, readSession, type SessionRole } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/logout" || pathname === "/api/leave-day") return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  const session = token ? await readSession(token) : null;
  const home = session ? homeFor(session.role) : "/";
  const area = (role: SessionRole) =>
    role === "ADMIN" ? "/admin" : role === "MANAGER" ? "/manager" : "/employee";

  if (!session && pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (session && pathname === "/") {
    return NextResponse.redirect(new URL(home, request.url));
  }
  if (session && ["/admin", "/manager", "/employee"].some((prefix) => pathname.startsWith(prefix) && prefix !== area(session.role))) {
    return NextResponse.redirect(new URL(home, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
