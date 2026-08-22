import { NextResponse } from "next/server";

/* The /enter page checks the passcode itself. Middleware only stops the
 * request early so nothing is rendered for a visitor without the cookie. */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/enter")) {
    const has = request.cookies.get("exchange_steward");
    if (!has) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/enter/:path*"] };
