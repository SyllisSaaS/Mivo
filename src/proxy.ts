import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge guard for the private area (Next.js "proxy", formerly middleware).
 *
 * This is the FIRST of two checks, not the only one. It runs before the page
 * is rendered and rejects anyone without a session cookie, which keeps
 * unauthenticated traffic away from admin rendering entirely.
 *
 * It deliberately does not verify the cookie's signature: the proxy runs on
 * the Edge runtime with no database access, so a cookie could be forged here.
 * Every admin page, Server Action and protected route therefore re-checks the
 * session against the database via `requireSession()` / `getSession()`, which
 * is where authorisation is actually enforced.
 */

const SESSION_COOKIE = "mivo_session";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page must stay reachable.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSessionCookie) {
    // Private API routes get a status code, not a redirect to an HTML page.
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow" } }
      );
    }

    const loginUrl = new URL("/admin/login", request.url);
    // Preserve where the visitor was heading, but only as a relative path.
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
