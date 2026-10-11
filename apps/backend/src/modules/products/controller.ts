/**
 * Products module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { productsService } from './service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { recordAudit } from '../../lib/audit';
import { param } from '../../lib/http';
import type { AuthedRequest } from '../../middleware/auth';
import type { CreateProductInput, UpdateProductInput, ProductListQuery } from './validators';

export const productsController = {
  // Public
  async list(req: Request, res: Response): Promise<void> {
    const result = await productsService.list(req.query as unknown as ProductListQuery);
    sendSuccess(res, result);
  },

  async listFeatured(_req: Request, res: Response): Promise<void> {
    const data = await productsService.listFeatured(8);
    sendSuccess(res, data);
  },

  async getBySlug(req: Request, res: Response): Promise<void> {
    const data = await productsService.getBySlug(param(req, 'slug'));
    sendSuccess(res, data);
  },

  // Admin
  async listAll(req: Request, res: Response): Promise<void> {
    const result = await productsService.list(req.query as unknown as ProductListQuery);
    sendSuccess(res, result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const data = await productsService.getById(param(req, 'id'));
    sendSuccess(res, data);
  },

  async create(req: Request, res: Response): Promise<void> {
    const product = await productsService.create(req.body as CreateProductInput);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'product.create',
      entity: 'Product',
      entityId: product.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendCreated(res, product);
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    const product = await productsService.update(id, req.body as UpdateProductInput);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'product.update',
      entity: 'Product',
      entityId: product.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, product);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    await productsService.remove(id);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'product.delete',
      entity: 'Product',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { message: 'Product deleted' });
  },
};
