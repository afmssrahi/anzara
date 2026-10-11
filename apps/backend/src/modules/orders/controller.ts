/**
 * Orders module - HTTP layer.
 *
 * Routes are split into three concerns:
 *   - Customer routes (place, list, get, cancel)
 *   - Admin routes (list, get, status, shipment, notes)
 *   - Shared internal helper for status transitions
 */
import type { Request, Response } from 'express';
import { ordersService } from './service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { recordAudit } from '../../lib/audit';
import { param } from '../../lib/http';
import type { AuthedRequest } from '../../middleware/auth';
import type {
  CreateOrderInput,
  OrderFilterInput,
  UpdateOrderStatusInput,
  OrderNoteInput,
} from '@anzara/validators';

export const ordersController = {
  // ==================== Customer ====================
  async place(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const body = req.body as CreateOrderInput;
    const order = await ordersService.place(userId, body);
    await recordAudit({
      action: 'order.create',
      entity: 'Order',
      entityId: order.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { userId, orderNumber: order.orderNumber, total: order.totals.total },
    });
    sendCreated(res, order);
  },

  async listMine(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const query = req.query as unknown as OrderFilterInput;
    sendSuccess(res, await ordersService.listForCustomer(userId, query));
  },

  async getMine(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    sendSuccess(res, await ordersService.getForCustomer(param(req, 'id'), userId));
  },

  async cancelMine(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthedRequest).user!.id;
    const id = param(req, 'id');
    const order = await ordersService.cancelByCustomer(id, userId);
    await recordAudit({
      action: 'order.cancel',
      entity: 'Order',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { userId, by: 'customer' },
    });
    sendSuccess(res, order);
  },

  // ==================== Admin ====================
  async listAll(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as OrderFilterInput;
    sendSuccess(res, await ordersService.listForAdmin(query));
  },

  async getOne(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await ordersService.getForAdmin(param(req, 'id')));
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    const body = req.body as UpdateOrderStatusInput;
    const adminId = (req as AuthedRequest).admin?.id ?? null;
    const order = await ordersService.updateStatus(id, adminId, body);
    await recordAudit({
      ...(adminId ? { adminId } : {}),
      action: 'order.update_status',
      entity: 'Order',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { to: body.status, reason: body.reason },
    });
    sendSuccess(res, order);
  },

  async updateShipment(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    const adminId = (req as AuthedRequest).admin?.id ?? null;
    const body = req.body as { status?: string; trackingNumber?: string; notes?: string };
    const order = await ordersService.updateShipment(id, adminId, body);
    await recordAudit({
      ...(adminId ? { adminId } : {}),
      action: 'order.update_shipment',
      entity: 'Order',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: body,
    });
    sendSuccess(res, order);
  },

  async addNote(req: Request, res: Response): Promise<void> {
    const id = param(req, 'id');
    const adminId = (req as AuthedRequest).admin!.id;
    const body = req.body as OrderNoteInput;
    const order = await ordersService.addNote(id, adminId, body);
    await recordAudit({
      adminId,
      action: 'order.add_note',
      entity: 'Order',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { isInternal: body.isInternal },
    });
    sendSuccess(res, order);
  },
};
