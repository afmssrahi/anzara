'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import { Badge, Button, useT, useToast } from '@anzara/ui';
import { coupons } from '../../../lib/api';
import { useAdminAuthStore } from '../../../lib/auth-store';
import type { AdminCoupon } from '@anzara/api-client';

export default function AdminCouponsPage() {
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAdminAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<AdminCoupon[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(true);
    coupons
      .list(accessToken, { page, limit: 20, ...(search ? { search } : {}) })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setTotal(res.meta.total);
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
  }, [accessToken, page, search, showError]);

  async function toggleActive(c: AdminCoupon) {
    if (!accessToken) return;
    try {
      const updated = await coupons.update(c.id, { isActive: !c.isActive }, accessToken);
      setItems((prev) => prev.map((it) => (it.id === c.id ? updated : it)));
      success(`Coupon ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  async function remove(c: AdminCoupon) {
    if (!accessToken) return;
    if (!confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    try {
      await coupons.remove(c.id, accessToken);
      setItems((prev) => prev.filter((it) => it.id !== c.id));
      setTotal((t) => Math.max(0, t - 1));
      success('Coupon deleted');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create promo codes and bulk-discount campaigns
          </p>
        </div>
        <Link href="/dashboard/coupons/create">
          <Button>+ New coupon</Button>
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by code or description"
          className="h-10 w-72 rounded-md border border-gray-300 px-3 text-sm focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Min order</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No coupons yet. Create your first one.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/coupons/${c.id}`}
                      className="font-mono font-medium text-brand-primary hover:underline"
                    >
                      {c.code}
                    </Link>
                    {c.description ? (
                      <p className="mt-0.5 text-xs text-gray-500">{c.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {c.discountType === 'PERCENTAGE'
                      ? `${c.discountValue}%`
                      : `৳${(c.discountValue / 100).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.minOrderAmount > 0 ? `৳${(c.minOrderAmount / 100).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.usageCount}
                    {c.usageLimit !== null ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString(locale) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'success' : 'danger'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      className="mr-2 text-xs text-gray-700 hover:underline"
                    >
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
