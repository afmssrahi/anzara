/**
 * Addresses module - route definitions.
 * All endpoints require a logged-in customer.
 */
import { Router } from 'express';
import { addressesController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { createAddressSchema, updateAddressSchema } from '@anzara/validators';

export const addressesRouter: Router = Router();

addressesRouter.use(requireAuth);

addressesRouter.get('/', asyncHandler(addressesController.list));
addressesRouter.get('/:id', asyncHandler(addressesController.getById));
addressesRouter.post('/', validate(createAddressSchema), asyncHandler(addressesController.create));
addressesRouter.patch(
  '/:id',
  validate(updateAddressSchema),
  asyncHandler(addressesController.update),
);
addressesRouter.delete('/:id', asyncHandler(addressesController.remove));
