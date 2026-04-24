import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/google/callback"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals and static assets (defensive — matcher may not apply).
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/static") ||
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("studio_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
