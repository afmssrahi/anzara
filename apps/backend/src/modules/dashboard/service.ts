/**
 * Dashboard module - business logic.
 */
import { dashboardRepository } from './repository';

export interface DashboardSummary {
  ordersToday: number;
  revenueLast30Days: { total: number; count: number };
  pendingReviews: number;
  lowStockCount: number;
  lowStockItems: Array<{
    variantId: string;
    sku: string;
    stockQuantity: number;
    lowStockThreshold: number;
    product: { id: string; slug: string; name: unknown };
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: Date;
    user: { firstName: string; lastName: string; email: string };
  }>;
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const [ordersToday, revenue, pendingReviews, lowStockCount, lowStockItems, recentOrders] =
      await Promise.all([
        dashboardRepository.ordersTodayCount(),
        dashboardRepository.revenueLast30Days(),
        dashboardRepository.pendingReviewsCount(),
        dashboardRepository.lowStockCount(),
        dashboardRepository.lowStockItems(5),
        dashboardRepository.recentOrders(5),
      ]);

    return {
      ordersToday,
      revenueLast30Days: revenue,
      pendingReviews,
      lowStockCount,
      lowStockItems,
      recentOrders,
    };
  },
};
