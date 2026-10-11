'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import type { Banner } from '@anzara/shared-types';
import { Badge, Button, useT, useToast } from '@anzara/ui';
import { content } from '../../../../lib/api';
import { useAdminAuthStore } from '../../../../lib/auth-store';

export default function AdminBannersPage() {
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAdminAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<Banner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(true);
    content
      .listBanners(accessToken, { page, limit: 20 })
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
  }, [accessToken, page, showError]);

  async function toggle(b: Banner) {
    if (!accessToken) return;
    try {
      const updated = await content.updateBanner(b.id, { isActive: !b.isActive }, accessToken);
      setItems((prev) => prev.map((it) => (it.id === b.id ? updated : it)));
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  async function remove(b: Banner) {
    if (!accessToken) return;
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    try {
      await content.deleteBanner(b.id, accessToken);
      setItems((prev) => prev.filter((it) => it.id !== b.id));
      setTotal((t) => Math.max(0, t - 1));
      success('Banner deleted');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="mt-1 text-sm text-gray-500">Homepage and campaign banners</p>
        </div>
        <Link href="/dashboard/content/banners/create">
          <Button>+ New banner</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="col-span-full text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No banners yet.
          </p>
        ) : (
          items.map((b) => (
            <article key={b.id} className="overflow-hidden rounded-lg border bg-white">
              <div className="relative aspect-[2/1] bg-gray-100">
                <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    {b.subtitle ? (
                      <p className="mt-0.5 text-xs text-gray-500">{b.subtitle}</p>
                    ) : null}
                  </div>
                  <Badge variant={b.isActive ? 'success' : 'default'}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Position: {b.position}
                  {b.startsAt ? ` · From ${new Date(b.startsAt).toLocaleDateString(locale)}` : ''}
                  {b.endsAt ? ` to ${new Date(b.endsAt).toLocaleDateString(locale)}` : ''}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Link
                    href={`/dashboard/content/banners/${b.id}`}
                    className="text-brand-primary hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(b)}
                    className="text-gray-700 hover:underline"
                  >
                    {b.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
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
