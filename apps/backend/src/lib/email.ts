/**
 * Email service.
 * Sends transactional email via Resend. Falls back to console logging in development
 * if no Resend key is configured, so the system works without third-party setup.
 */
import { getEnv } from '@anzara/config';
import { logger } from './logger';

interface OtpEmailParams {
  to: string;
  code: string;
  purpose: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';
}

interface OrderEmailParams {
  to: string;
  subject: string;
  html: string;
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

export const emailService = {
  async sendOtp(to: string, code: string, purpose: OtpEmailParams['purpose']): Promise<void> {
    const html = buildOtpHtml(code, purpose);
    await this.send({ to, subject: `Your Anzara ${PURPOSE_LABELS[purpose]} code`, html });
  },

  async sendOrderEmail(params: OrderEmailParams): Promise<void> {
    await this.send(params);
  },

  async send(params: { to: string; subject: string; html: string }): Promise<void> {
    const env = getEnv();
    if (!env.RESEND_API_KEY) {
      logger.info(
        { to: params.to, subject: params.subject },
        'Email (DEV mode - no Resend key, content not logged to avoid leaking OTPs)',
      );
      return;
    }
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (err) {
      logger.error({ err, to: params.to }, 'Failed to send email');
      // Don't throw - email failures shouldn't break user flows in this phase
    }
  },
};
