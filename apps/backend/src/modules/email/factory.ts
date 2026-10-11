/**
 * Resolves the active email provider based on env.
 *
 *   - RESEND_API_KEY set       -> ResendEmailProvider
 *   - otherwise                -> FileEmailProvider (writes to EMAIL_OUTBOX_DIR)
 *
 * To add SMTP, Brevo, Postmark, etc.: create a new provider class in this
 * folder, then add a case below. No other code in the app needs to change.
 */
import { getEnv } from '@anzara/config';
import type { EmailProvider } from './provider';
import { FileEmailProvider } from './file-provider';
import { ResendEmailProvider } from './resend-provider';

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const env = getEnv();
  cached = env.RESEND_API_KEY ? new ResendEmailProvider() : new FileEmailProvider();
  return cached;
}

/** Test-only: reset the cached singleton. */
export function resetEmailProvider(): void {
  cached = null;
}
