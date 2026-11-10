import { locales, type Locale } from "./locales";

/** Prefix an internal pathname with a locale segment if not already prefixed. */
export function localizedPath(locale: Locale, path: string) {
  if (!path.startsWith("/")) return path;
  if (locales.some((loc) => path === `/${loc}` || path.startsWith(`/${loc}/`))) {
    return path;
  }
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

export function safeNextPath(value: unknown, fallback = "/account") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
