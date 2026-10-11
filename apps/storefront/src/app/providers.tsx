'use client';

import type { ReactNode } from 'react';
import { I18nProvider, ToastProvider } from '@anzara/ui';

export function StorefrontProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}
