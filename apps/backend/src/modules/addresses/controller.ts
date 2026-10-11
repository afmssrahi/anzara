/**
 * Addresses module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { addressesService } from './service';
import { sendSuccess, sendCreated, sendNoContent } from '../../lib/response';
import { recordAudit } from '../../lib/audit';
import { param } from '../../lib/http';
import type { AuthedRequest } from '../../middleware/auth';
import type { CreateAddressInput, UpdateAddressInput } from '@anzara/validators';

export const addressesController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    sendSuccess(res, await addressesService.list(userId));
  },

  async getById(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    sendSuccess(res, await addressesService.getById(param(req, 'id'), userId));
  },

  async create(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const body = req.body as CreateAddressInput;
    const dto = await addressesService.create(userId, body);
    await recordAudit({
      action: 'address.create',
      entity: 'Address',
      entityId: dto.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { userId },
    });
    sendCreated(res, dto);
  },

  async update(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const body = req.body as UpdateAddressInput;
    const dto = await addressesService.update(param(req, 'id'), userId, body);
    sendSuccess(res, dto);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const id = param(req, 'id');
    await addressesService.remove(id, userId);
    await recordAudit({
      action: 'address.delete',
      entity: 'Address',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { userId },
    });
    sendNoContent(res);
  },
};
