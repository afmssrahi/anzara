'use client';

import { useTransition } from 'react';
import { LOCALES, useT } from './provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={locale}
      onChange={(e) => {
        const next = e.target.value as 'en' | 'bn';
        startTransition(() => setLocale(next));
      }}
      disabled={isPending}
      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-brand-primary focus:outline-none"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {l === 'en' ? 'EN' : 'বাং'}
        </option>
      ))}
    </select>
  );
}
