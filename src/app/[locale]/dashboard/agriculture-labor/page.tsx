import { permanentRedirect } from "next/navigation";
import { locale as rootLocale } from "next/root-params";

import { defaultLocale, isLocale, type Locale } from "@/i18n/locales";
import { localizedPath } from "@/i18n/paths";

export default async function LegacyAgriculturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [paramLocale, values] = await Promise.all([rootLocale(), searchParams]);
  const locale: Locale = isLocale(paramLocale) ? paramLocale : defaultLocale;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  permanentRedirect(
    localizedPath(locale, `/dashboard/agriculture${query.size ? `?${query.toString()}` : ""}`),
  );
}
