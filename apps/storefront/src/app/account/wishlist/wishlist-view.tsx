'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import type { WishlistItem } from '@anzara/shared-types';
import { Button, formatBDT, useT, useToast } from '@anzara/ui';
import { wishlist } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

export default function WishlistView() {
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login?return=/account/wishlist');
      return;
    }
    let cancelled = false;
    wishlist
      .list(accessToken)
      .then((list) => {
        if (!cancelled) setItems(list);
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
  }, [accessToken, router, showError]);

  async function remove(productId: string) {
    if (!accessToken) return;
    setBusyId(productId);
    try {
      await wishlist.remove(productId, accessToken);
      setItems((prev) => prev.filter((it) => it.productId !== productId));
      success('Removed from wishlist');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!accessToken || isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-gray-500">Loading…</div>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My wishlist</h1>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-sm text-gray-500">Your wishlist is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline"
          >
            Browse products →
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            const isBusy = busyId === it.productId;
            const name = (it.productName?.en ?? '') || (it.productName?.bn ?? '');
            return (
              <li key={it.id} className="rounded-lg border bg-white p-4">
                <Link
                  href={`/products/${it.productSlug}`}
                  className="block aspect-square overflow-hidden rounded bg-gray-100"
                >
                  {it.productImage ? (
                    <img src={it.productImage} alt={name} className="h-full w-full object-cover" />
                  ) : null}
                </Link>
                <Link
                  href={`/products/${it.productSlug}`}
                  className="mt-3 block text-sm font-medium text-gray-900 hover:text-brand-primary"
                >
                  {name}
                </Link>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatBDT(it.basePrice.amount, locale)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => router.push(`/products/${it.productSlug}`)}
                  >
                    View
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(it.productId)}
                    disabled={isBusy}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
