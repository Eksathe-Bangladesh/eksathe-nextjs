"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale, type Locale } from "@/i18n/locales";
import { localizedPath } from "@/i18n/paths";
import { auth } from "@/lib/auth";

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  redirect(localizedPath(locale, "/"));
}
