/**
 * Cart module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { cartService } from './service';
import { sendSuccess } from '../../lib/response';
import { param } from '../../lib/http';
import type { AuthedRequest } from '../../middleware/auth';
import type { AddToCartInput, UpdateCartItemInput } from '@anzara/validators';

export const cartController = {
  async get(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    sendSuccess(res, await cartService.get(userId));
  },

  async addItem(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const body = req.body as AddToCartInput;
    sendSuccess(res, await cartService.addItem(userId, body));
  },

  async updateItem(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const body = req.body as UpdateCartItemInput;
    sendSuccess(res, await cartService.updateItem(userId, body.itemId, body.quantity));
  },

  async removeItem(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    sendSuccess(res, await cartService.removeItem(userId, param(req, 'itemId')));
  },

  async clear(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    sendSuccess(res, await cartService.clear(userId));
  },
};
