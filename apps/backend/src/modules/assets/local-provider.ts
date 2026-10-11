/**
 * Local asset provider.
 * Stores uploads on disk under UPLOAD_DIR and returns a public URL built
 * from API_URL + /uploads/<key>. Swap for CloudinaryProvider when ready.
 *
 * Security:
 *   - Sniffs magic bytes (not the client-supplied mime type) before accepting.
 *   - Renames the file to a random 16-byte hex id; original filename is never used.
 *   - Sanitizes the `folder` segment to a [a-z0-9/_-]+ allowlist to block
 *     path traversal (../, absolute paths, NUL bytes, weird unicode).
 *   - Resolves the final path with realpath and asserts it stays inside
 *     UPLOAD_DIR before writing or deleting.
 *   - SVG is rejected outright: a valid SVG is XML and can carry <script>
 *     payloads that execute when served with the wrong content type.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getEnv } from '@anzara/config';
import type { AssetProvider, UploadedAsset } from './provider';

interface SniffedImage {
  ext: string;
  mimeType: string;
}

interface MagicMatch {
  mimeType: string;
  ext: string;
  check: (b: Buffer) => boolean;
}

const MAGIC_BYTES: MagicMatch[] = [
  {
    mimeType: 'image/jpeg',
    ext: 'jpg',
    check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    ext: 'png',
    check: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mimeType: 'image/gif',
    ext: 'gif',
    check: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x39 || b[4] === 0x37) &&
      b[5] === 0x61,
  },
  {
    mimeType: 'image/webp',
    ext: 'webp',
    check: (b) =>
      b.length >= 12 &&
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
  {
    mimeType: 'image/avif',
    ext: 'avif',
    check: (b) =>
      b.length >= 12 &&
      b.toString('ascii', 4, 8) === 'ftyp' &&
      (b.toString('ascii', 8, 11) === 'avif' || b.toString('ascii', 8, 11) === 'avis'),
  },
];

/** Sniff the first ~12 bytes and return a verified mime + extension. */
function sniffImage(buffer: Buffer): SniffedImage | null {
  for (const m of MAGIC_BYTES) {
    if (m.check(buffer)) return { mimeType: m.mimeType, ext: m.ext };
  }
  return null;
}

/**
 * Sanitize a folder name like "products/<id>" to ["products", "<id>"].
 * Reject anything outside [a-z0-9_-], allow up to 4 segments, length capped.
 */
function sanitizeFolder(folder: string | undefined): string[] {
  if (!folder) return [];
  const parts = folder
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 4) return [];
  for (const p of parts) {
    if (p.length > 64) return [];
    if (!/^[a-z0-9_-]+$/i.test(p)) return [];
  }
  return parts;
}

export class LocalAssetProvider implements AssetProvider {
  private readonly env = getEnv();

  private get uploadRoot(): string {
    return path.resolve(process.cwd(), this.env.UPLOAD_DIR);
  }

  /**
   * Verify the resolved absolute path lives inside the upload root.
   * Protects against symlink swaps and weird relative paths.
   */
  private isInsideRoot(abs: string): boolean {
    const root = this.uploadRoot;
    const norm = path.resolve(abs);
    const rel = path.relative(root, norm);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  async upload(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder?: string;
  }): Promise<UploadedAsset> {
    if (input.buffer.length > this.env.UPLOAD_MAX_BYTES) {
      throw new Error('File too large');
    }
    if (input.buffer.length === 0) {
      throw new Error('Empty file');
    }
    // SVG can carry script payloads — reject regardless of magic bytes.
    if (/\.svg$/i.test(input.originalName) || input.mimeType === 'image/svg+xml') {
      throw new Error('SVG uploads are not allowed');
    }
    // Sniff the bytes; trust the result, not the client mime.
    const sniffed = sniffImage(input.buffer);
    if (!sniffed) {
      throw new Error('Unsupported or invalid image (magic bytes did not match)');
    }
    // Cross-check: if multer thought it was a known mime, it should match.
    if (input.mimeType !== 'application/octet-stream' && input.mimeType !== sniffed.mimeType) {
      throw new Error('MIME type does not match file content');
    }

    const id = crypto.randomBytes(16).toString('hex');
    const segments = ['uploads', ...sanitizeFolder(input.folder), `${id}.${sniffed.ext}`];
    const key = segments.join('/');
    const abs = path.resolve(process.cwd(), key);
    if (!this.isInsideRoot(abs)) {
      throw new Error('Invalid upload destination');
    }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    // Make the file unexecutable; the web server serves it as static.
    await fs.writeFile(abs, input.buffer, { mode: 0o644 });
    return {
      url: `${this.env.API_URL.replace(/\/+$/, '')}/${key}`,
      publicId: key,
      bytes: input.buffer.length,
      mimeType: sniffed.mimeType,
    };
  }

  async remove(publicId: string): Promise<void> {
    if (!publicId) return;
    // publicId is the relative key we returned; resolve and assert it's inside root.
    const abs = path.resolve(process.cwd(), publicId);
    if (!this.isInsideRoot(abs)) return;
    // realpath guard for symlinks.
    let real: string;
    try {
      real = await fs.realpath(abs);
    } catch {
      return; // already gone
    }
    if (!this.isInsideRoot(real)) return;
    await fs.unlink(real).catch(() => undefined);
  }
}
