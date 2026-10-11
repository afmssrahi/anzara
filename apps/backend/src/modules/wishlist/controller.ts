/**
 * Wishlist module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { wishlistService } from './service';
import { sendSuccess } from '../../lib/response';
import { addToWishlistSchema, productIdParamSchema } from './validators';
import type { AuthedRequest } from '../../middleware/auth';
import { BadRequestError } from '../../lib/errors';

function requireUserId(req: Request): string {
  const id = (req as AuthedRequest).user?.id;
  if (!id) throw new BadRequestError('Login required');
  return id;
}

export const wishlistController = {
  async list(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await wishlistService.list(requireUserId(req)));
  },

  async add(req: Request, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const body = addToWishlistSchema.parse(req.body);
    sendSuccess(res, await wishlistService.add(userId, body));
  },

  async remove(req: Request, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const { productId } = productIdParamSchema.parse(req.params);
    await wishlistService.remove(userId, productId);
    sendSuccess(res, { productId });
  },

  async check(req: Request, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const { productId } = productIdParamSchema.parse(req.params);
    const items = await wishlistService.list(userId);
    sendSuccess(res, { productId, inWishlist: items.some((it) => it.productId === productId) });
  },
};
