'use client';

import type { ReactNode } from 'react';
import { I18nProvider, ToastProvider } from '@anzara/ui';

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}
