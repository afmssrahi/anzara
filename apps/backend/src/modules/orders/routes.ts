/**
 * Orders module - route definitions.
 *
 * Two routers:
 *  - customerOrdersRouter   /orders       (authenticated customer)
 *  - adminOrdersRouter      /admin/orders (authenticated admin)
 *
 * @openapi
 * tags:
 *   - name: Orders
 *   - name: Admin · Orders
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

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Place an order (snapshot the current cart)
 *     description: |
 *       Reads the current cart, snapshots items + prices, decrements
 *       stock, applies the coupon if any, and clears the cart. The
 *       response is the created `Order` with its `orderNumber`.
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId]
 *             properties:
 *               addressId: { type: 'string' }
 *               paymentMethod:
 *                 type: 'string'
 *                 enum: [COD]
 *                 default: COD
 *               notes: { type: 'string', maxLength: 500 }
 *     responses:
 *       201:
 *         description: Order placed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Cart empty, address invalid, etc.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422:
 *         description: Stock not available
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
customerOrdersRouter.post(
  '/',
  writeRateLimiter,
  validate(createOrderSchema),
  asyncHandler(ordersController.place),
);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List your own orders
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: 'integer', default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: 'integer', default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     data: { type: 'array', items: { $ref: '#/components/schemas/Order' } }
 *                     meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
customerOrdersRouter.get(
  '/',
  validate(orderFilterSchema, 'query'),
  asyncHandler(ordersController.listMine),
);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get one of your own orders
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
customerOrdersRouter.get(
  '/:id',
  validate(orderIdParamSchema, 'params'),
  asyncHandler(ordersController.getMine),
);

/**
 * @openapi
 * /api/orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel your own order (only while PENDING)
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: Order cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422:
 *         description: Order is no longer PENDING
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
customerOrdersRouter.post(
  '/:id/cancel',
  writeRateLimiter,
  validate(orderIdParamSchema, 'params'),
  asyncHandler(ordersController.cancelMine),
);

export const adminOrdersRouter: Router = Router();
adminOrdersRouter.use(requireAdmin);

/**
 * @openapi
 * /api/admin/orders:
 *   get:
 *     tags: [Admin · Orders]
 *     summary: List ALL orders (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: 'integer', default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: 'integer', default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     data: { type: 'array', items: { $ref: '#/components/schemas/Order' } }
 *                     meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
adminOrdersRouter.get(
  '/',
  requirePermission('order:view'),
  validate(orderFilterSchema, 'query'),
  asyncHandler(ordersController.listAll),
);

/**
 * @openapi
 * /api/admin/orders/{id}:
 *   get:
 *     tags: [Admin · Orders]
 *     summary: Get one order (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminOrdersRouter.get(
  '/:id',
  requirePermission('order:view'),
  validate(orderIdParamSchema, 'params'),
  asyncHandler(ordersController.getOne),
);

/**
 * @openapi
 * /api/admin/orders/{id}/status:
 *   patch:
 *     tags: [Admin · Orders]
 *     summary: Update order status (admin)
 *     description: Triggers a transactional email to the customer.
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: 'string'
 *                 enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, FAILED, RETURNED]
 *               reason: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminOrdersRouter.patch(
  '/:id/status',
  requirePermission('order:update'),
  validate(orderIdParamSchema, 'params'),
  validate(updateOrderStatusSchema),
  asyncHandler(ordersController.updateStatus),
);

/**
 * @openapi
 * /api/admin/orders/{id}/shipment:
 *   patch:
 *     tags: [Admin · Orders]
 *     summary: Update shipment details (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: 'string'
 *                 enum: [PENDING, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED]
 *               trackingNumber: { type: 'string', maxLength: 100 }
 *               notes: { type: 'string', maxLength: 500 }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminOrdersRouter.patch(
  '/:id/shipment',
  requirePermission('order:update'),
  validate(orderIdParamSchema, 'params'),
  validate(shipmentUpdateSchema),
  asyncHandler(ordersController.updateShipment),
);

/**
 * @openapi
 * /api/admin/orders/{id}/notes:
 *   post:
 *     tags: [Admin · Orders]
 *     summary: Add an internal note to an order (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: 'string', maxLength: 2000 }
 *               isInternal: { type: 'boolean', default: true }
 *     responses:
 *       200:
 *         description: Note added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: 'string' }
 *                     content: { type: 'string' }
 *                     isInternal: { type: 'boolean' }
 *                     createdAt: { $ref: '#/components/schemas/ISODate' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminOrdersRouter.post(
  '/:id/notes',
  requirePermission('order:update'),
  validate(orderIdParamSchema, 'params'),
  validate(orderNoteSchema),
  asyncHandler(ordersController.addNote),
);
