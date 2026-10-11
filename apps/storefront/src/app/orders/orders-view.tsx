'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import type { Order, OrderStatus } from '@anzara/shared-types';
import { Badge, Select, formatBDT, useT, useToast } from '@anzara/ui';
import { orders } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  AWAITING_CONFIRMATION: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

const STATUS_VARIANT: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  PENDING: 'warning',
  AWAITING_CONFIRMATION: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'outline',
  RETURN_REQUESTED: 'warning',
  RETURNED: 'outline',
  REFUNDED: 'outline',
};

export function OrdersView() {
  const router = useRouter();
  const { locale } = useT();
  const { error: showError } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!accessToken) {
      router.push('/login?return=/orders');
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    orders
      .listMine({ limit: 20, ...(status ? { status: status as OrderStatus } : {}) }, accessToken)
      .then((page) => {
        if (!cancelled) setItems(page.data);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError) showError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, router, status, showError]);

  if (!accessToken) return null;
  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-gray-500">Loading…</div>;
  }
  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold">My orders</h1>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-sm text-gray-500">You have no orders yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline"
          >
            Start shopping →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">My orders</h1>
        <div className="w-48">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Total
              </th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.orderNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  {formatBDT(o.totals.total.amount, locale)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-sm text-brand-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
