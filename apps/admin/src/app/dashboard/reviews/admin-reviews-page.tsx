'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@anzara/api-client';
import type { AdminReview } from '@anzara/api-client';
import { Badge, Button, useT, useToast } from '@anzara/ui';
import { reviews } from '../../../lib/api';
import { useAdminAuthStore } from '../../../lib/auth-store';

type FilterTab = 'pending' | 'approved' | 'all';

export default function AdminReviewsPage() {
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAdminAuthStore((s) => s.accessToken);

  const [tab, setTab] = useState<FilterTab>('pending');
  const [items, setItems] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(true);
    const params: Parameters<typeof reviews.listForAdmin>[1] = { page, limit: 20 };
    if (tab === 'pending') params.isApproved = false;
    if (tab === 'approved') params.isApproved = true;
    if (search) params.search = search;
    reviews
      .listForAdmin(accessToken, params)
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
  }, [accessToken, tab, page, search, showError]);

  async function setApproved(r: AdminReview, isApproved: boolean) {
    if (!accessToken) return;
    try {
      const updated = await reviews.moderate(r.id, { isApproved }, accessToken);
      setItems((prev) => prev.map((it) => (it.id === r.id ? updated : it)));
      success(isApproved ? 'Review approved' : 'Review rejected');
      // Optimistically drop from the pending list
      if (tab === 'pending' && isApproved) {
        setItems((prev) => prev.filter((it) => it.id !== r.id));
        setTotal((t) => Math.max(0, t - 1));
      } else if (tab === 'approved' && !isApproved) {
        setItems((prev) => prev.filter((it) => it.id !== r.id));
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  async function toggleFeatured(r: AdminReview) {
    if (!accessToken) return;
    try {
      const updated = await reviews.moderate(r.id, { isFeatured: !r.isFeatured }, accessToken);
      setItems((prev) => prev.map((it) => (it.id === r.id ? updated : it)));
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  async function remove(r: AdminReview) {
    if (!accessToken) return;
    if (!confirm(`Delete review by ${r.userDisplayName}?`)) return;
    try {
      await reviews.delete(r.id, accessToken);
      setItems((prev) => prev.filter((it) => it.id !== r.id));
      setTotal((t) => Math.max(0, t - 1));
      success('Review deleted');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="mt-1 text-sm text-gray-500">
            Approve, reject, and feature customer reviews
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border bg-white text-sm">
          {(['pending', 'approved', 'all'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setPage(1);
                setTab(t);
              }}
              className={
                tab === t
                  ? 'border-r px-3 py-2 capitalize text-brand-primary last:border-r-0'
                  : 'border-r px-3 py-2 capitalize text-gray-500 last:border-r-0 hover:bg-gray-50'
              }
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by comment, title, or email"
          className="h-10 w-72 rounded-md border border-gray-300 px-3 text-sm focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No reviews in this view.
          </p>
        ) : (
          items.map((r) => (
            <article key={r.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <p className="font-medium text-gray-900">{r.userDisplayName}</p>
                    {r.isVerified ? <Badge variant="success">Verified buyer</Badge> : null}
                    {r.isFeatured ? <Badge variant="warning">Featured</Badge> : null}
                    <span className="text-amber-500">
                      {'★'.repeat(r.rating)}
                      <span className="text-gray-200">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                  {r.title ? (
                    <p className="mt-2 text-sm font-medium text-gray-900">{r.title}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-gray-700">{r.comment}</p>
                  {r.productName ? (
                    <p className="mt-2 text-xs text-gray-500">
                      on{' '}
                      <a
                        href={`/dashboard/products`}
                        className="text-brand-primary hover:underline"
                      >
                        {r.productName}
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t pt-3">
                {!r.isApproved ? (
                  <Button size="sm" onClick={() => setApproved(r, true)}>
                    Approve
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setApproved(r, false)}>
                    Unapprove
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => toggleFeatured(r)}>
                  {r.isFeatured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(r)}>
                  Delete
                </Button>
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
