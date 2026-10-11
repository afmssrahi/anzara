/**
 * Assets module - route definitions.
 * POST /api/assets/upload (admin only) — single image, returns the public URL.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendCreated, sendSuccess } from '../../lib/response';
import { requireAdmin, requirePermission } from '../../middleware/auth';
import { assetUpload } from './middleware';
import { getAssetProvider } from './factory';
import { param } from '../../lib/http';
import { uploadRateLimiter } from '../../middleware/rate-limit';

export const assetsRouter: Router = Router();

assetsRouter.post(
  '/upload',
  requireAdmin,
  requirePermission('product:create'),
  uploadRateLimiter,
  assetUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing file field "file"' },
      });
      return;
    }
    const folderRaw = req.body?.folder;
    const folder = typeof folderRaw === 'string' && folderRaw.length > 0 ? folderRaw : undefined;
    const result = await getAssetProvider().upload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder,
    });
    sendCreated(res, result);
  }),
);

assetsRouter.delete(
  '/:publicId',
  requireAdmin,
  requirePermission('product:delete'),
  asyncHandler(async (req, res) => {
    const publicId = param(req, 'publicId');
    if (!publicId) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing publicId' },
      });
      return;
    }
    await getAssetProvider().remove(publicId);
    sendSuccess(res, { message: 'Asset removed' });
  }),
);
