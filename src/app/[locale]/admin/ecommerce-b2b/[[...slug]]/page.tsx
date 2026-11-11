import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/locales";
import { redirect } from "@/i18n/navigation";

export const instant = false;

export default async function LegacyCommerceAdminRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale, slug = [] }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const suffix = slug.length ? `/${slug.map(encodeURIComponent).join("/")}` : "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value])
      search.append(key, item);
  }
  const queryString = search.size ? `?${search.toString()}` : "";
  redirect({ href: `/admin/ecommerce${suffix}${queryString}`, locale });
}
