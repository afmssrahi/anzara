/**
 * Top-level API router.
 * Mounts each module's routes under its namespace.
 * Add a new module by creating a folder under src/modules/ and mounting here.
 */
import { Router } from 'express';
import { authRouter } from './modules/auth/routes';
import { healthRouter } from './modules/health/routes';

export const apiRouter: Router = Router();

// Each module is mounted under its own path prefix.
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

// Future modules - to be added in later phases:
// apiRouter.use('/products', productsRouter);
// apiRouter.use('/categories', categoriesRouter);
// apiRouter.use('/cart', cartRouter);
// apiRouter.use('/checkout', checkoutRouter);
// apiRouter.use('/orders', ordersRouter);
// apiRouter.use('/payments', paymentsRouter);
// apiRouter.use('/shipments', shipmentsRouter);
// apiRouter.use('/admin/products', adminProductsRouter);
// apiRouter.use('/admin/orders', adminOrdersRouter);
// apiRouter.use('/admin/inventory', adminInventoryRouter);
// apiRouter.use('/admin/settings', adminSettingsRouter);
// apiRouter.use('/admin/integrations', adminIntegrationsRouter);
// apiRouter.use('/admin/users', adminUsersRouter);
// apiRouter.use('/admin/coupons', adminCouponsRouter);
// apiRouter.use('/admin/reviews', adminReviewsRouter);
// apiRouter.use('/admin/cms', adminCmsRouter);
// apiRouter.use('/admin/reports', adminReportsRouter);
// apiRouter.use('/admin/dashboard', adminDashboardRouter);
