/**
 * Email provider contract.
 *
 * The rest of the app talks to this, never to a specific provider.
 * The factory in `./factory.ts` picks the right impl at startup based on env.
 *
 * To add a new provider (SMTP, Brevo, Postmark, SendGrid, ...):
 *   1. Create a new file: `apps/backend/src/modules/email/<name>-provider.ts`
 *   2. Implement `EmailProvider` with the same `send()` signature.
 *   3. Add a case in `factory.ts`.
 *   4. Set the matching env keys.
 * No call site or controller needs to change.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** HTML body. Some adapters also accept `text`; the default builds it. */
  html: string;
  text?: string;
  /** Optional reply-to address. */
  replyTo?: string;
  /** Tag for logs/filtering (e.g. "otp", "order-shipped"). */
  tag?: string;
}

export interface EmailSendResult {
  /** Provider-specific id, or null when the impl doesn't track one (file outbox). */
  id: string | null;
  /** Which provider actually sent the message. */
  provider: 'file' | 'resend' | 'smtp';
}

export interface EmailProvider {
  readonly name: EmailSendResult['provider'];
  send(message: EmailMessage): Promise<EmailSendResult>;
}
