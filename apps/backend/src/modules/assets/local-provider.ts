/**
 * Local asset provider.
 * Stores uploads on disk under UPLOAD_DIR and returns a public URL built
 * from API_URL + /uploads/<key>. Swap for CloudinaryProvider when ready.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getEnv } from '@anzara/config';
import type { AssetProvider, UploadedAsset } from './provider';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

function extFromOriginal(name: string, mime: string): string {
  const fromName = path.extname(name).replace(/^\./, '').toLowerCase();
  if (fromName) return fromName;
  return EXT_BY_MIME[mime] ?? 'bin';
}

export class LocalAssetProvider implements AssetProvider {
  private readonly env = getEnv();

  private get uploadRoot(): string {
    return path.resolve(process.cwd(), this.env.UPLOAD_DIR);
  }

  async upload(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder?: string;
  }): Promise<UploadedAsset> {
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new Error(`Unsupported image type: ${input.mimeType}`);
    }
    if (input.buffer.length > this.env.UPLOAD_MAX_BYTES) {
      throw new Error('File too large');
    }
    const ext = extFromOriginal(input.originalName, input.mimeType);
    const id = crypto.randomBytes(12).toString('hex');
    const segments = ['uploads'];
    if (input.folder) segments.push(...input.folder.split('/').filter(Boolean));
    segments.push(`${id}.${ext}`);
    const key = segments.join('/');
    const abs = path.resolve(process.cwd(), key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, input.buffer);
    return {
      url: `${this.env.API_URL.replace(/\/+$/, '')}/${key}`,
      publicId: key,
      bytes: input.buffer.length,
      mimeType: input.mimeType,
    };
  }

  async remove(publicId: string): Promise<void> {
    const abs = path.resolve(process.cwd(), publicId);
    if (!abs.startsWith(this.uploadRoot)) return; // safety: never leave UPLOAD_DIR
    await fs.unlink(abs).catch(() => undefined);
  }
}
