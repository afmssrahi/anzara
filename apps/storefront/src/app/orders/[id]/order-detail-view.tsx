'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import type { Order, OrderStatus } from '@anzara/shared-types';
import { Badge, Button, formatBDT, useT, useToast } from '@anzara/ui';
import { orders } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

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

export function OrderDetailView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const showSuccess = searchParams.get('placed') === '1';

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    orders
      .getMine(orderId, accessToken)
      .then((o) => {
        if (!cancelled) setOrder(o);
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
  }, [accessToken, router, orderId, showError]);

  if (!accessToken) return null;
  if (isLoading || !order) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-gray-500">Loading…</div>;
  }

  const canCancel = order.status === 'PENDING' || order.status === 'AWAITING_CONFIRMATION';

  async function handleCancel() {
    if (!accessToken) return;
    setIsCancelling(true);
    try {
      const fresh = await orders.cancelMine(order!.id, accessToken);
      setOrder(fresh);
      success('Order cancelled');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not cancel');
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {showSuccess && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          ✓ Order placed. You'll get a confirmation email shortly.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Items</h2>
            <ul className="mt-3 divide-y">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.productName.en}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="text-gray-900">{it.productName.en}</p>
                    <p className="text-xs text-gray-500">
                      {[it.size ? `Size ${it.size}` : null, it.color ?? null]
                        .filter(Boolean)
                        .join(' · ')}{' '}
                      × {it.quantity}
                    </p>
                    <p className="text-xs text-gray-400">SKU: {it.variantSku}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatBDT(it.subtotal.amount, locale)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Shipping address</h2>
            <div className="mt-2 text-sm text-gray-700">
              <p className="font-medium">
                {order.shippingAddress.fullName} · {order.shippingAddress.phone}
              </p>
              <p>
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2
                  ? `, ${order.shippingAddress.addressLine2}`
                  : ''}
              </p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.district},{' '}
                {order.shippingAddress.division}
                {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
              </p>
            </div>
            {order.shipment?.trackingNumber && (
              <p className="mt-3 text-xs text-gray-500">
                Tracking: <span className="font-medium">{order.shipment.trackingNumber}</span>
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Status history</h2>
            <ol className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4 text-sm">
              {order.statusHistory.map((s, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-brand-primary" />
                  <p className="text-gray-900">
                    {s.fromStatus ? `${s.fromStatus} → ` : ''}
                    <span className="font-medium">{s.toStatus}</span>
                    {s.reason ? ` · ${s.reason}` : ''}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(s.changedAt).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="h-fit space-y-4">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Subtotal" amount={order.totals.subtotal.amount} locale={locale} />
              <Row label="Discount" amount={order.totals.discount.amount} locale={locale} />
              <Row label="Shipping" amount={order.totals.shipping.amount} locale={locale} />
              <Row label="Tax" amount={order.totals.tax.amount} locale={locale} />
              <div className="my-2 border-t" />
              <div className="flex items-baseline justify-between">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-semibold text-gray-900">
                  {formatBDT(order.totals.total.amount, locale)}
                </dd>
              </div>
            </dl>
            <div className="mt-3 rounded-md border border-dashed border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
              <p>
                <span className="font-medium">{order.payment.method}</span> · {order.payment.status}
              </p>
              {order.payment.paidAt && (
                <p>Paid: {new Date(order.payment.paidAt).toLocaleString()}</p>
              )}
            </div>
          </div>
          {canCancel && (
            <Button variant="outline" fullWidth isLoading={isCancelling} onClick={handleCancel}>
              Cancel order
            </Button>
          )}
          <Link href="/orders" className="block text-center text-sm text-gray-500 hover:underline">
            ← All orders
          </Link>
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
