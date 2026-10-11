/**
 * Orders module - route definitions.
 *
 * Three routers:
 *  - customerOrdersRouter   /orders       (authenticated customer)
 *  - adminOrdersRouter      /admin/orders (authenticated admin)
 *  - shipmentRouter is a sub-router on /admin/orders/:id
 */
import { Router } from 'express';
import { z } from 'zod';
import { ordersController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin, requirePermission } from '../../middleware/auth';
import { writeRateLimiter } from '../../middleware/rate-limit';
import {
  createOrderSchema,
  orderFilterSchema,
  updateOrderStatusSchema,
  orderNoteSchema,
} from '@anzara/validators';

const orderIdParamSchema = z.object({ id: z.string().min(1) });

const shipmentUpdateSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED',
      'RETURNED',
    ])
    .optional(),
  trackingNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const customerOrdersRouter: Router = Router();
customerOrdersRouter.use(requireAuth);

customerOrdersRouter.post(
  '/',
  writeRateLimiter,
  validate(createOrderSchema),
  asyncHandler(ordersController.place),
);
customerOrdersRouter.get(
  '/',
  validate(orderFilterSchema, 'query'),
  asyncHandler(ordersController.listMine),
);
customerOrdersRouter.get(
  '/:id',
  validate(orderIdParamSchema, 'params'),
  asyncHandler(ordersController.getMine),
);
customerOrdersRouter.post(
  '/:id/cancel',
  writeRateLimiter,
  validate(orderIdParamSchema, 'params'),
  asyncHandler(ordersController.cancelMine),
);

export const adminOrdersRouter: Router = Router();
adminOrdersRouter.use(requireAdmin);

adminOrdersRouter.get(
  '/',
  requirePermission('order:view'),
  validate(orderFilterSchema, 'query'),
  asyncHandler(ordersController.listAll),
);
adminOrdersRouter.get(
  '/:id',
  requirePermission('order:view'),
  validate(orderIdParamSchema, 'params'),
  asyncHandler(ordersController.getOne),
);
adminOrdersRouter.patch(
  '/:id/status',
  requirePermission('order:update'),
  validate(orderIdParamSchema, 'params'),
  validate(updateOrderStatusSchema),
  asyncHandler(ordersController.updateStatus),
);
adminOrdersRouter.patch(
  '/:id/shipment',
  requirePermission('order:update'),
  validate(orderIdParamSchema, 'params'),
  validate(shipmentUpdateSchema),
  asyncHandler(ordersController.updateShipment),
);
adminOrdersRouter.post(
  '/:id/notes',
  requirePermission('order:update'),
  validate(orderIdParamSchema, 'params'),
  validate(orderNoteSchema),
  asyncHandler(ordersController.addNote),
);
