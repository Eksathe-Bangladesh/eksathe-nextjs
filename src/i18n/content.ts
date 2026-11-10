import { locales, type Locale } from "./locales";

// Fetch every supported locale so the last-resort fallback is not filtered out by SQL.
export function translationLocalesFor(locale: Locale): Locale[] {
  return [...new Set([locale, ...locales])];
}

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
    translations.find((translation) => translation.locale === fallbackLocale) ??
    translations[0]
  );
}
