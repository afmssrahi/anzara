'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardSummary } from '@anzara/api-client';
import { AdminShell } from '../../lib/guard';
import { useAdminAuthStore } from '../../lib/auth-store';
import { dashboard } from '../../lib/api';

function formatBDT(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-BD', { maximumFractionDigits: 0 });
}

function statusColor(s: string): string {
  switch (s) {
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'SHIPPED':
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'CONFIRMED':
      return 'bg-indigo-100 text-indigo-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CANCELLED':
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function pickLocalizedName(name: unknown): string {
  if (typeof name === 'object' && name !== null) {
    const o = name as Record<string, unknown>;
    if (typeof o['en'] === 'string') return o['en'] as string;
    if (typeof o['bn'] === 'string') return o['bn'] as string;
  }
  return '';
}

export default function DashboardPage() {
  const admin = useAdminAuthStore((s) => s.admin);
  const accessToken = useAdminAuthStore((s) => s.accessToken);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    dashboard
      .summary(accessToken)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch((err) => {
        if (!cancelled) console.error('dashboard error', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {admin?.firstName ?? 'Admin'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Here&apos;s what&apos;s happening with your store.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Orders today"
            value={summary ? String(summary.ordersToday) : '—'}
            hint="All statuses"
            loading={isLoading}
          />
          <StatCard
            label="Revenue (30d)"
            value={summary ? formatBDT(summary.revenueLast30Days.total) : '—'}
            hint={
              summary
                ? `${summary.revenueLast30Days.count} order${summary.revenueLast30Days.count === 1 ? '' : 's'}`
                : 'BDT'
            }
            loading={isLoading}
          />
          <StatCard
            label="Pending reviews"
            value={summary ? String(summary.pendingReviews) : '—'}
            hint={summary && summary.pendingReviews > 0 ? 'Needs moderation' : 'All clear'}
            loading={isLoading}
            link={summary && summary.pendingReviews > 0 ? '/dashboard/reviews' : undefined}
          />
          <StatCard
            label="Low stock items"
            value={summary ? String(summary.lowStockCount) : '—'}
            hint={summary && summary.lowStockCount > 0 ? 'Refill soon' : 'Healthy'}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3 text-sm font-semibold text-gray-900">
              Recent orders
            </div>
            <div className="divide-y">
              {isLoading ? (
                <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>
              ) : !summary || summary.recentOrders.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400">No orders yet.</p>
              ) : (
                summary.recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{o.orderNumber}</p>
                      <p className="text-xs text-gray-500">
                        {o.user.firstName} {o.user.lastName} ·{' '}
                        {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatBDT(o.total)}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(o.status)}`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3 text-sm font-semibold text-gray-900">Low stock</div>
            <div className="divide-y">
              {isLoading ? (
                <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>
              ) : !summary || summary.lowStockItems.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400">
                  All variants are above their threshold.
                </p>
              ) : (
                summary.lowStockItems.map((it) => (
                  <div
                    key={it.variantId}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {pickLocalizedName(it.product.name)}
                      </p>
                      <p className="text-xs text-gray-500">SKU {it.sku}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${it.stockQuantity === 0 ? 'text-red-600' : 'text-amber-600'}`}
                      >
                        {it.stockQuantity}
                      </p>
                      <p className="text-xs text-gray-400">threshold {it.lowStockThreshold}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  loading,
  link,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  link?: string;
}) {
  const inner = (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">
        {loading ? <span className="text-gray-300">…</span> : value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
  if (link) {
    return (
      <Link href={link} className="block transition hover:shadow-sm">
        {inner}
      </Link>
    );
  }
  return inner;
}
