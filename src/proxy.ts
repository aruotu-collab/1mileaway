import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COUNTRY_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { countryFromPathname, isLaunchCountry } from "@/lib/countries/catalog";
import { resolveVisitorCountry } from "@/lib/countries/detect";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if ((pathname.startsWith("/admin") || pathname.startsWith("/professional")) && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const pathCountry = countryFromPathname(pathname);
  if (pathCountry) requestHeaders.set("x-page-country", pathCountry.iso2);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const cookie = request.cookies.get(COUNTRY_COOKIE)?.value;
  const guessed = pathCountry
    ? pathCountry
    : !cookie || !isLaunchCountry(cookie)
      ? resolveVisitorCountry({
          geo: request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry"),
          acceptLanguage: request.headers.get("accept-language"),
        })
      : null;
  if (guessed && guessed.iso2 !== cookie) {
    response.cookies.set(COUNTRY_COOKIE, guessed.iso2, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
