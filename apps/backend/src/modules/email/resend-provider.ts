/**
 * Resend email provider.
 *
 * Lazy-loaded only when RESEND_API_KEY is set. Falls back to a thrown error
 * if the import fails or the API rejects, so the caller can decide whether
 * to surface the failure.
 */
import { getEnv } from '@anzara/config';
import { logger } from '../../lib/logger';
import type { EmailMessage, EmailProvider, EmailSendResult } from './provider';

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const env = getEnv();
    // Lazy import keeps the dep off the critical path when RESEND_API_KEY is unset.
    const { Resend } = await import('resend');
    const resend = new Resend(env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });

    if ('error' in result && result.error) {
      logger.error(
        { err: result.error, to: message.to, tag: message.tag },
        'Resend returned an error',
      );
      throw new Error(result.error.message ?? 'Resend send failed');
    }

    const id = (result as { data?: { id?: string } }).data?.id ?? null;
    logger.info(
      { to: message.to, subject: message.subject, tag: message.tag, id },
      'Email sent via Resend',
    );
    return { id, provider: 'resend' };
  }
}
