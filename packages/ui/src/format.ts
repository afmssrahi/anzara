/**
 * Money + localization formatting shared by both apps.
 * BDT only for now.
 */
const LOCALE_BY_LANG: Record<'en' | 'bn', string> = { en: 'en-BD', bn: 'bn-BD' };

export function formatBDT(paisa: number, locale: 'en' | 'bn' = 'en'): string {
  const amount = paisa / 100;
  return new Intl.NumberFormat(LOCALE_BY_LANG[locale], {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function pickLocalized(
  localized: Record<'en' | 'bn', string> | undefined,
  locale: 'en' | 'bn',
  fallback: string = '',
): string {
  if (!localized) return fallback;
  return localized[locale] || localized.en || localized.bn || fallback;
}
