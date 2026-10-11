/**
 * Categories module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { categoriesService } from './service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { recordAudit } from '../../lib/audit';
import { param } from '../../lib/http';
import type { AuthedRequest } from '../../middleware/auth';
import type { CreateCategoryInput, UpdateCategoryInput } from './validators';

export const categoriesController = {
  // Public
  async list(_req: Request, res: Response): Promise<void> {
    const data = await categoriesService.listActive();
    sendSuccess(res, data);
  },

  async getBySlug(req: Request, res: Response): Promise<void> {
    const data = await categoriesService.getBySlug(param(req, 'slug'));
    sendSuccess(res, data);
  },

  // Admin
  async listAll(_req: Request, res: Response): Promise<void> {
    const data = await categoriesService.listAll();
    sendSuccess(res, data);
  },

  async create(req: Request, res: Response): Promise<void> {
    const category = await categoriesService.create(req.body as CreateCategoryInput);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'category.create',
      entity: 'Category',
      entityId: category.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendCreated(res, category);
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    const category = await categoriesService.update(id, req.body as UpdateCategoryInput);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'category.update',
      entity: 'Category',
      entityId: category.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, category);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    await categoriesService.remove(id);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'category.delete',
      entity: 'Category',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { message: 'Category deleted' });
  },
};
