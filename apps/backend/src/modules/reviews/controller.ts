/**
 * Reviews module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { reviewsService } from './service';
import { sendSuccess } from '../../lib/response';
import {
  createReviewSchema,
  productIdParamSchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from './validators';
import type { AuthedRequest } from '../../middleware/auth';
import { BadRequestError } from '../../lib/errors';
import { reviewsRepository } from './repository';

function requireUserId(req: Request): string {
  const id = (req as AuthedRequest).user?.id;
  if (!id) throw new BadRequestError('Login required');
  return id;
}

function requireAdminId(req: Request): string {
  const id = (req as AuthedRequest).admin?.id;
  if (!id) throw new BadRequestError('Admin access required');
  return id;
}

export const reviewsController = {
  // ----- Public -----
  async listForProduct(req: Request, res: Response): Promise<void> {
    const { productId } = productIdParamSchema.parse(req.params);
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 10)));
    sendSuccess(res, await reviewsService.listForProduct(productId, page, limit));
  },

  async summary(req: Request, res: Response): Promise<void> {
    const { productId } = productIdParamSchema.parse(req.params);
    sendSuccess(res, await reviewsService.summary(productId));
  },

  // ----- Customer -----
  async create(req: Request, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const body = createReviewSchema.parse(req.body);
    sendSuccess(res, await reviewsService.create(userId, body));
  },

  async updateMine(req: Request, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const { id } = reviewIdParamSchema.parse(req.params);
    const body = updateReviewSchema.parse(req.body);
    sendSuccess(res, await reviewsService.updateMine(userId, id, body));
  },

  async deleteMine(req: Request, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const { id } = reviewIdParamSchema.parse(req.params);
    await reviewsService.deleteMine(userId, id);
    sendSuccess(res, { id });
  },

  // ----- Admin -----
  async listForAdmin(req: Request, res: Response): Promise<void> {
    // Validation already ran in the route's validate() middleware, so
    // req.query is the parsed & transformed ReviewFilterInput.
    const q = req.query as unknown as Parameters<typeof reviewsService.listForAdmin>[0];
    sendSuccess(res, await reviewsService.listForAdmin(q));
  },

  async moderate(req: Request, res: Response): Promise<void> {
    const adminId = requireAdminId(req);
    // The route's validate() middleware already parsed req.params and req.body.
    const { id } = req.params as unknown as { id: string };
    const body = req.body as Parameters<typeof reviewsService.moderate>[2];
    sendSuccess(res, await reviewsService.moderate(adminId, id, body));
  },

  async delete(req: Request, res: Response): Promise<void> {
    const adminId = requireAdminId(req);
    const { id } = reviewIdParamSchema.parse(req.params);
    await reviewsService.delete(adminId, id);
    sendSuccess(res, { id });
  },
};

// Avoid unused-import warnings if certain helpers go unused after refactor.
void reviewsRepository;
