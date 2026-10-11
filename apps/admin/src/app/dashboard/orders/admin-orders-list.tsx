'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import type { OrderStatus } from '@anzara/shared-types';
import { Badge, Button, Input, Select, formatBDT, useT, useToast } from '@anzara/ui';
import { AdminShell } from '../../../lib/guard';
import { useAdminAuthStore } from '../../../lib/auth-store';
import { orders } from '../../../lib/api';

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

export default function AdminOrdersPage() {
  const { locale } = useT();
  const { error: showError } = useToast();
  const token = useAdminAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<
    Array<{
      id: string;
      orderNumber: string;
      createdAt: string;
      status: OrderStatus;
      totals: { total: { amount: number; currency: string } };
      payment: { method: string; status: string };
      customer?: { email: string; firstName: string; lastName: string } | null;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    orders.admin
      .list(
        {
          page,
          limit: pageSize,
          search: search || undefined,
          status: status ? (status as OrderStatus) : undefined,
        },
        token,
      )
      .then((r) => {
        setItems(r.data);
        setTotal(r.meta.total);
      })
      .catch((err) => {
        if (err instanceof ApiError) showError(err.message);
        else showError('Failed to load orders');
      })
      .finally(() => setIsLoading(false));
  }, [token, page, pageSize, search, status, showError]);

  if (!token) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Sign in to view orders.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
            <p className="mt-1 text-sm text-gray-600">
              {total} total · {isLoading ? 'loading…' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="search"
              placeholder="Search by order number, customer name, or email…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <div className="w-48">
            <Select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
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
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Payment
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Total
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                    {isLoading ? 'Loading…' : 'No orders match.'}
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {o.customer ? (
                        <>
                          <p>
                            {o.customer.firstName} {o.customer.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{o.customer.email}</p>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {o.payment.method} · {o.payment.status}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatBDT(o.totals.total.amount, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="text-sm text-brand-primary hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
