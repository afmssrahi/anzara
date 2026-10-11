/**
 * Multer setup for asset uploads.
 * Single in-memory file buffer (UPLOAD_MAX_BYTES cap).
 */
import multer from 'multer';
import { getEnv } from '@anzara/config';

const env = getEnv();

export const assetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});
