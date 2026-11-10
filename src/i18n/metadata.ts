import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { locales } from "./locales";
import { getPathname } from "./navigation";

export async function localizedCanonical(href: string) {
  const locale = await getLocale();
  return getPathname({ locale, href });
}

export async function getPageMetadata(
  page:
    | "home"
    | "dashboard"
    | "agriculture"
    | "agricultureMarket"
    | "agricultureUpdates"
    | "agriculturePrices"
    | "construction"
    | "constructionMarket",
  canonical?: string,
): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t(`${page}.title`),
    description: t(`${page}.description`),
    ...(canonical
      ? {
          alternates: {
            canonical: await localizedCanonical(canonical),
            languages: Object.fromEntries(
              locales.map((locale) => [locale, getPathname({ locale, href: canonical })]),
            ),
          },
        }
      : {}),
  };
}
