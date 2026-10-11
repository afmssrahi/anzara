/**
 * File email provider.
 *
 * Writes every email as a JSON file into EMAIL_OUTBOX_DIR. Used in dev and as
 * the default when no third-party provider is configured, so flows work
 * end-to-end with zero setup. The OTP email is then visible on disk (read
 * it manually during dev) instead of being silently dropped.
 *
 * Files are named `<ISO-timestamp>__<tag>__<to>.json` and `oldest` sorted so
 * the most recent is easy to find.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getEnv } from '@anzara/config';
import { logger } from '../../lib/logger';
import type { EmailMessage, EmailProvider, EmailSendResult } from './provider';

function safeFilePart(s: string): string {
  return s.replace(/[^a-z0-9.@_-]/gi, '_').slice(0, 80);
}

export class FileEmailProvider implements EmailProvider {
  readonly name = 'file' as const;

  private get outboxDir(): string {
    return path.resolve(process.cwd(), getEnv().EMAIL_OUTBOX_DIR);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const dir = this.outboxDir;
    await fs.mkdir(dir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const id = crypto.randomBytes(6).toString('hex');
    const filename = `${ts}__${safeFilePart(message.tag ?? 'mail')}__${safeFilePart(message.to)}__${id}.json`;
    const abs = path.join(dir, filename);

    // Sanity check: resolved path must stay inside outboxDir.
    const real = path.resolve(dir, filename);
    if (!real.startsWith(path.resolve(dir) + path.sep)) {
      throw new Error('Refusing to write email outbox file outside outbox dir');
    }

    const payload = {
      id,
      sentAt: new Date().toISOString(),
      from: getEnv().EMAIL_FROM,
      ...message,
    };
    await fs.writeFile(abs, JSON.stringify(payload, null, 2), { mode: 0o600 });

    logger.info(
      { to: message.to, subject: message.subject, tag: message.tag, path: abs },
      'Email written to local outbox',
    );

    return { id, provider: 'file' };
  }
}
