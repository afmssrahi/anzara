/**
 * Top-level API router.
 * Mounts each module's routes under its namespace.
 */
import { Router } from 'express';
import { authRouter } from './modules/auth/routes';
import { healthRouter } from './modules/health/routes';
import { productsRouter, adminProductsRouter } from './modules/products/routes';
import { categoriesRouter, adminCategoriesRouter } from './modules/categories/routes';
import { collectionsRouter, adminCollectionsRouter } from './modules/collections/routes';
import { assetsRouter } from './modules/assets/routes';
import { addressesRouter } from './modules/addresses/routes';
import { cartRouter } from './modules/cart/routes';
import { customerOrdersRouter, adminOrdersRouter } from './modules/orders/routes';
import { adminSettingsRouter } from './modules/settings/routes';
import { publicPaymentsRouter } from './modules/payments';
import { customerCouponsRouter, adminCouponsRouter } from './modules/coupons';
import { reviewsRouter, adminReviewsRouter } from './modules/reviews';
import { wishlistRouter } from './modules/wishlist';
import { publicContentRouter, adminContentRouter } from './modules/content';
import { publicSettingsRouter } from './modules/settings';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

// Public catalog
apiRouter.use('/products', productsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/collections', collectionsRouter);

// Public payment-method list (drives the storefront's payment picker)
apiRouter.use('/payments', publicPaymentsRouter);

// Public content (banners, pages) + public settings (WhatsApp, brand, social)
apiRouter.use('/content', publicContentRouter);
apiRouter.use('/settings', publicSettingsRouter);

// Public reviews (also exposes POST /:id, PATCH /:id, DELETE /:id behind auth)
apiRouter.use('/reviews', reviewsRouter);

// Customer-scoped
apiRouter.use('/addresses', addressesRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/orders', customerOrdersRouter);
apiRouter.use('/coupons', customerCouponsRouter);
apiRouter.use('/wishlist', wishlistRouter);

// Asset uploads (admin only, permission-gated)
apiRouter.use('/assets', assetsRouter);

// Admin namespaces
apiRouter.use('/admin/products', adminProductsRouter);
apiRouter.use('/admin/categories', adminCategoriesRouter);
apiRouter.use('/admin/collections', adminCollectionsRouter);
apiRouter.use('/admin/orders', adminOrdersRouter);
apiRouter.use('/admin/settings', adminSettingsRouter);
apiRouter.use('/admin/coupons', adminCouponsRouter);
apiRouter.use('/admin/reviews', adminReviewsRouter);
apiRouter.use('/admin/content', adminContentRouter);
