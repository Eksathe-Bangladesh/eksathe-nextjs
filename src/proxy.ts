import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, isLocale, locales } from "@/i18n/locales";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasLocalePrefix = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`),
  );

  if (!hasLocalePrefix) {
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    const targetLocale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
    const targetPath = pathname === "/" ? `/${targetLocale}` : `/${targetLocale}${pathname}`;
    const redirectUrl = new URL(`${targetPath}${search}`, request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("NEXT_LOCALE", targetLocale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    return response;
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except API routes, Next internals, and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
