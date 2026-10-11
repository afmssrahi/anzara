/**
 * Collections module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { collectionsService } from './service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { recordAudit } from '../../lib/audit';
import { param } from '../../lib/http';
import type { AuthedRequest } from '../../middleware/auth';
import type { CreateCollectionInput, UpdateCollectionInput } from './validators';

export const collectionsController = {
  async list(_req: Request, res: Response): Promise<void> {
    const data = await collectionsService.listActive();
    sendSuccess(res, data);
  },

  async getBySlug(req: Request, res: Response): Promise<void> {
    const data = await collectionsService.getBySlug(param(req, 'slug'));
    sendSuccess(res, data);
  },

  async listAll(_req: Request, res: Response): Promise<void> {
    const data = await collectionsService.listAll();
    sendSuccess(res, data);
  },

  async create(req: Request, res: Response): Promise<void> {
    const collection = await collectionsService.create(req.body as CreateCollectionInput);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'collection.create',
      entity: 'Collection',
      entityId: collection.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendCreated(res, collection);
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    const collection = await collectionsService.update(id, req.body as UpdateCollectionInput);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'collection.update',
      entity: 'Collection',
      entityId: collection.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, collection);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    await collectionsService.remove(id);
    const authReq = req as AuthedRequest;
    await recordAudit({
      adminId: authReq.admin?.id,
      action: 'collection.delete',
      entity: 'Collection',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { message: 'Collection deleted' });
  },
};
