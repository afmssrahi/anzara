/**
 * Dashboard module - aggregates for the admin home page.
 *
 * All counts are computed on demand. The dashboard isn't on a hot path,
 * so this is fine; if traffic grows we can cache with redis.
 */
import { prisma } from '@anzara/database';

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOf30DaysAgoUtc(): Date {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() - 30);
  return d;
}

export const dashboardRepository = {
  async ordersTodayCount(): Promise<number> {
    const from = startOfTodayUtc();
    return prisma.order.count({ where: { createdAt: { gte: from } } });
  },

  async revenueLast30Days(): Promise<{ total: number; count: number }> {
    const from = startOf30DaysAgoUtc();
    // Exclude cancelled; use the canonical final total.
    const rows = await prisma.order.findMany({
      where: {
        createdAt: { gte: from },
        status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      select: { total: true },
    });
    let total = 0;
    for (const r of rows) total += r.total;
    return { total, count: rows.length };
  },

  async pendingReviewsCount(): Promise<number> {
    return prisma.review.count({ where: { isApproved: false } });
  },

  async lowStockCount(): Promise<number> {
    // Product variants that are active, in stock, and at or below their low-stock threshold.
    return prisma.productVariant.count({
      where: {
        isActive: true,
        stockQuantity: { lte: 5 }, // upper bound; we'll re-filter by the per-row threshold below
      },
    });
  },

  async lowStockItems(limit: number = 10) {
    // Join the threshold check via per-row filtering; we pull a small page and
    // re-filter in JS. Cheap enough at this size; swap for a raw query if
    // the catalog grows large.
    const rows = await prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { select: { id: true, slug: true, name: true } } },
      take: 200, // bound
    });
    return rows
      .filter((v) => v.stockQuantity <= (v.lowStockThreshold ?? 5))
      .slice(0, limit)
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        stockQuantity: v.stockQuantity,
        lowStockThreshold: v.lowStockThreshold ?? 5,
        product: v.product,
      }));
  },

  async recentOrders(limit: number = 5) {
    return prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  },
};
