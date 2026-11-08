import type { Locale } from "./locales";

export type LocalizedValue = {
  bn?: string | null;
  en?: string | null;
};

export type TranslationRecord = {
  locale: string;
};

export function resolveTranslation<T extends TranslationRecord>(
  translations: readonly T[],
  locale: string,
  fallbackLocale: string,
): T | undefined {
  return (
    translations.find((translation) => translation.locale === locale) ??
    translations.find((translation) => translation.locale === fallbackLocale)
  );
}

/**
 * Selects the localized database value for the active locale, falling back to
 * the other language when the preferred field is empty.
 */
export function pickLocalized(locale: Locale, value: LocalizedValue): string {
  const primary = locale === "bn" ? value.bn : value.en;
  const secondary = locale === "bn" ? value.en : value.bn;
  return primary?.trim() ? primary : (secondary ?? "");
}
