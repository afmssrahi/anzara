'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import type { Cart } from '@anzara/shared-types';
import { Button, formatBDT, useT, useToast } from '@anzara/ui';
import { cart } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';

export function CartView() {
  const router = useRouter();
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [cartData, setCartData] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login?return=/cart');
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    cart
      .get(accessToken)
      .then((c) => {
        if (!cancelled) setCartData(c);
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

  async function changeQty(itemId: string, quantity: number) {
    if (!accessToken) return;
    setBusyId(itemId);
    try {
      const fresh = await cart.updateItem(itemId, { itemId, quantity }, accessToken);
      setCartData(fresh);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not update quantity');
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!accessToken) return;
    setBusyId(itemId);
    try {
      const fresh = await cart.removeItem(itemId, accessToken);
      setCartData(fresh);
      success('Removed from cart');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not remove item');
    } finally {
      setBusyId(null);
    }
  }

  if (!accessToken || isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-gray-500">Loading…</div>;
  }
  if (!cartData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-gray-500">Could not load your cart.</p>
      </div>
    );
  }
  if (cartData.items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold">Your cart</h1>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-sm text-gray-500">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline"
          >
            Browse products →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your cart</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {cartData.items.map((item) => {
            const isBusy = busyId === item.id;
            return (
              <article key={item.id} className="flex gap-4 rounded-lg border bg-white p-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.image ? (
                    <img
                      src={item.image.url}
                      alt={item.image.alt}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-primary"
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {[
                          item.size ? `Size: ${item.size}` : null,
                          item.color ? `Color: ${item.color}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">SKU: {item.variantSku}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatBDT(item.subtotal.amount, locale)}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => changeQty(item.id, Math.max(0, item.quantity - 1))}
                        disabled={isBusy}
                        className="h-8 w-8 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() =>
                          changeQty(item.id, Math.min(item.maxQuantity, item.quantity + 1))
                        }
                        disabled={isBusy}
                        className="h-8 w-8 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isBusy}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <div className="flex justify-between pt-2 text-sm">
            <button
              type="button"
              onClick={async () => {
                if (!accessToken) return;
                const fresh = await cart.clear(accessToken);
                setCartData(fresh);
                success('Cart cleared');
              }}
              className="text-gray-500 hover:underline"
            >
              Clear cart
            </button>
            <Link href="/products" className="text-brand-primary hover:underline">
              ← Continue shopping
            </Link>
          </div>
        </section>

        <aside className="h-fit rounded-lg border bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" amount={cartData.subtotal.amount} locale={locale} />
            <Row label="Discount" amount={cartData.discount.amount} locale={locale} />
            <Row label="Shipping" amount={cartData.shipping.amount} locale={locale} />
            <Row label="Tax" amount={cartData.tax.amount} locale={locale} />
            <div className="my-2 border-t" />
            <div className="flex items-baseline justify-between">
              <dt className="text-sm font-semibold text-gray-900">Total</dt>
              <dd className="text-base font-semibold text-gray-900">
                {formatBDT(cartData.total.amount, locale)}
              </dd>
            </div>
          </dl>
          <Button fullWidth size="lg" className="mt-6" onClick={() => router.push('/checkout')}>
            Checkout
          </Button>
          <p className="mt-3 text-center text-xs text-gray-500">Cash on delivery available</p>
        </aside>
      </div>
    </main>
  );
}

function Row({ label, amount, locale }: { label: string; amount: number; locale: 'en' | 'bn' }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-gray-900">{formatBDT(amount, locale)}</dd>
    </div>
  );
}
