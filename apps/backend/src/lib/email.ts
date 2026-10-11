/**
 * Email service.
 *
 * Thin domain-specific wrapper around the active EmailProvider. The actual
 * transport (file outbox / Resend / future SMTP) is decided by
 * `modules/email/factory.ts` based on env. Callers here only know about
 * `sendOtp`, `sendOrderEmail`, etc.
 *
 * In dev with no RESEND_API_KEY set, every email is written to
 * `emails-outbox/<timestamp>__<tag>__<to>.json` and the OTP code is visible
 * on disk - no third-party setup required.
 */
import { logger } from './logger';
import { getEmailProvider } from '../modules/email/factory';
import type { EmailMessage } from '../modules/email/provider';

interface OtpEmailParams {
  to: string;
  code: string;
  purpose: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';
}

interface OrderEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const PURPOSE_LABELS: Record<OtpEmailParams['purpose'], string> = {
  LOGIN: 'login verification',
  REGISTER: 'account registration',
  RESET_PASSWORD: 'password reset',
};

function buildOtpHtml(code: string, purpose: string): string {
  const label = PURPOSE_LABELS[purpose as OtpEmailParams['purpose']] ?? 'verification';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #0F4C5C; margin: 0 0 24px;">Anzara</h1>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">Your ${label} code is:</p>
      <div style="background: #f5f5f5; padding: 24px; text-align: center; margin: 24px 0; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0F4C5C;">${code}</span>
      </div>
      <p style="color: #666; font-size: 14px; line-height: 1.6;">This code expires in 10 minutes. If you didn't request it, please ignore this email.</p>
    </div>
  `;
}

function buildOtpText(code: string, purpose: string): string {
  const label = PURPOSE_LABELS[purpose as OtpEmailParams['purpose']] ?? 'verification';
  return `Your Anzara ${label} code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request it, please ignore this email.`;
}

async function send(message: EmailMessage): Promise<void> {
  const provider = getEmailProvider();
  try {
    await provider.send(message);
  } catch (err) {
    // Don't throw - email failures shouldn't break user flows in this phase.
    // A future "outbox + retry" job can pick failed sends up from the log.
    logger.error(
      { err, to: message.to, subject: message.subject, tag: message.tag },
      'Failed to send email',
    );
  }
}

export const emailService = {
  async sendOtp(to: string, code: string, purpose: OtpEmailParams['purpose']): Promise<void> {
    const label = PURPOSE_LABELS[purpose];
    await send({
      to,
      subject: `Your Anzara ${label} code`,
      html: buildOtpHtml(code, purpose),
      text: buildOtpText(code, purpose),
      tag: `otp-${purpose.toLowerCase()}`,
    });
  },

  async sendOrderEmail(params: OrderEmailParams): Promise<void> {
    await send({ ...params, tag: 'order' });
  },

  /** Generic send for future templates (newsletter, marketing, etc.). */
  async sendRaw(message: EmailMessage): Promise<void> {
    await send(message);
  },
};
