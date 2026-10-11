'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, variant, durationMs }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    },
    [],
  );

  const value: ToastContextValue = {
    showToast,
    success: (m) => showToast(m, 'success'),
    error: (m) => showToast(m, 'error'),
    info: (m) => showToast(m, 'info'),
    warning: (m) => showToast(m, 'warning'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              'pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-sm',
              variantClasses[t.variant],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op default for components rendered without a provider
    return {
      showToast: () => undefined,
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warning: () => undefined,
    };
  }
  return ctx;
}
