import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, readSession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/logout") return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  const session = token ? await readSession(token) : null;
  const home = session?.role === "ADMIN" ? "/admin" : "/employee";

  if (!session && pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (session && pathname === "/") {
    return NextResponse.redirect(new URL(home, request.url));
  }
  if (session?.role === "EMPLOYEE" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/employee", request.url));
  }
  if (session?.role === "ADMIN" && pathname.startsWith("/employee")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
