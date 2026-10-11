/**
 * Admin dashboard surface.
 */
import type { ApiClient } from './client';

export interface DashboardLowStockItem {
  variantId: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  product: { id: string; slug: string; name: unknown };
}

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

export interface DashboardSummary {
  ordersToday: number;
  revenueLast30Days: { total: number; count: number };
  pendingReviews: number;
  lowStockCount: number;
  lowStockItems: DashboardLowStockItem[];
  recentOrders: DashboardRecentOrder[];
}

export function createDashboardClient({ api }: { api: ApiClient }) {
  return {
    summary(token: string) {
      return api.request<DashboardSummary>('/api/admin/dashboard', { token });
    },
  };
}

export type DashboardClient = ReturnType<typeof createDashboardClient>;
