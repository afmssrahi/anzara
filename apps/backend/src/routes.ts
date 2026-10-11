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

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

// Public catalog
apiRouter.use('/products', productsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/collections', collectionsRouter);

// Asset uploads (admin only, permission-gated)
apiRouter.use('/assets', assetsRouter);

// Admin namespaces
apiRouter.use('/admin/products', adminProductsRouter);
apiRouter.use('/admin/categories', adminCategoriesRouter);
apiRouter.use('/admin/collections', adminCollectionsRouter);
