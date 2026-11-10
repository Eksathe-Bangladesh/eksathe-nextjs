export const locales = ["en", "bn"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bn";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function getLocaleOrDefault(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
