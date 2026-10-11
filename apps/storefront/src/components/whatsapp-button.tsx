'use client';

import { useEffect, useState } from 'react';
import { publicSettings } from '../lib/api';

/**
 * Floating WhatsApp button.
 *
 * Reads the `social.whatsapp` public setting. If empty, renders nothing.
 * Setting the value in admin Settings (group: social, isPublic: true)
 * is the only thing needed to enable the button.
 */
export function WhatsAppButton() {
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicSettings
      .all()
      .then((s) => {
        if (cancelled) return;
        const v = s['social.whatsapp'];
        if (typeof v === 'string' && v.trim()) setNumber(v.trim());
        else if (typeof v === 'object' && v) {
          // JSON value shape {"number":"+880..."}
          const n = (v as { number?: unknown }).number;
          if (typeof n === 'string' && n.trim()) setNumber(n.trim());
        }
      })
      .catch(() => {
        /* settings endpoint is optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!number) return null;
  // Strip everything but digits and a leading + for wa.me URL.
  const phone = number.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const href = `https://wa.me/${phone}?text=${encodeURIComponent('Hi! I have a question about your products.')}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#1ebe5b]"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 0 5.37 0 12c0 2.12.55 4.18 1.6 6L0 24l6.2-1.62A11.92 11.92 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.19-3.48-8.52zM12 22a9.94 9.94 0 01-5.07-1.39l-.36-.21-3.69.96.99-3.6-.23-.37A9.94 9.94 0 1112 22zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.06 2.89 1.21 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.62.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
      </svg>
    </a>
  );
}
