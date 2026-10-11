'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AdminShell } from '../../../lib/guard';
import { useAdminAuthStore } from '../../../lib/auth-store';
import { products } from '../../../lib/api';
import { Badge, Button, Input, Select, useT, pickLocalized } from '@anzara/ui';
import type { Product } from '@anzara/shared-types';

export default function AdminProductsPage() {
  const { locale } = useT();
  const token = useAdminAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    products.admin
      .list(
        {
          page,
          limit: pageSize,
          search: search || undefined,
          status: status ? (status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') : undefined,
        },
        token,
      )
      .then((r) => {
        setItems(r.data);
        setTotal(r.meta.total);
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [token, page, pageSize, search, status]);

  if (!token) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Sign in to manage products.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Products</h2>
            <p className="mt-1 text-sm text-gray-600">
              {total} total · {isLoading ? 'loading…' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/products/new"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            + New product
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="search"
              placeholder="Search by slug or tag…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <div className="w-40">
            <Select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Variants
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    {isLoading ? 'Loading…' : 'No products yet. Click "New product" to add one.'}
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded bg-gray-100">
                          {p.images[0] ? (
                            <img
                              src={p.images[0].url}
                              alt={p.images[0].alt}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pickLocalized(p.name, locale)}
                          </p>
                          <p className="text-xs text-gray-500">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          p.status === 'PUBLISHED'
                            ? 'success'
                            : p.status === 'DRAFT'
                              ? 'warning'
                              : 'outline'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      ৳{Math.round(p.basePrice.amount / 100)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.totalStock === 0 ? (
                        <Badge variant="danger">0</Badge>
                      ) : p.totalStock <= 5 ? (
                        <Badge variant="warning">{p.totalStock}</Badge>
                      ) : (
                        <span className="text-gray-700">{p.totalStock}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.variants.length}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="text-sm text-brand-primary hover:underline"
                      >
                        Edit
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
