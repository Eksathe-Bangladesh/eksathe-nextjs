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
