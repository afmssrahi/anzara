'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import type { Page } from '@anzara/shared-types';
import { Badge, Button, useT, useToast } from '@anzara/ui';
import { content } from '../../../../lib/api';
import { useAdminAuthStore } from '../../../../lib/auth-store';

export default function AdminPagesPage() {
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAdminAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<Page[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(true);
    content
      .listPages(accessToken, { page, limit: 20, ...(search ? { search } : {}) })
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

  async function toggle(p: Page) {
    if (!accessToken) return;
    try {
      const updated = await content.updatePage(p.id, { isPublished: !p.isPublished }, accessToken);
      setItems((prev) => prev.map((it) => (it.id === p.id ? updated : it)));
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  async function remove(p: Page) {
    if (!accessToken) return;
    if (!confirm(`Delete page "${p.slug}"?`)) return;
    try {
      await content.deletePage(p.id, accessToken);
      setItems((prev) => prev.filter((it) => it.id !== p.id));
      setTotal((t) => Math.max(0, t - 1));
      success('Page deleted');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Static content pages (about, terms, privacy, etc.)
          </p>
        </div>
        <Link href="/dashboard/content/pages/create">
          <Button>+ New page</Button>
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
          placeholder="Search by slug or title"
          className="h-10 w-72 rounded-md border border-gray-300 px-3 text-sm focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No pages yet.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/content/pages/${p.id}`}
                      className="font-mono text-brand-primary hover:underline"
                    >
                      /{p.slug}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.title.en || <span className="text-gray-400">(no title)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(p.updatedAt).toLocaleDateString(locale)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isPublished ? 'success' : 'default'}>
                      {p.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      className="mr-2 text-xs text-gray-700 hover:underline"
                    >
                      {p.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
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
