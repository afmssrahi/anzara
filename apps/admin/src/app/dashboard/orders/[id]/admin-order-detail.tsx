'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError, type AdminOrderListItem } from '@anzara/api-client';
import type { OrderStatus, ShipmentRecord } from '@anzara/shared-types';
import {
  Badge,
  Button,
  FormField,
  Input,
  Select,
  Textarea,
  formatBDT,
  useT,
  useToast,
} from '@anzara/ui';
import { AdminShell } from '../../../../lib/guard';
import { useAdminAuthStore } from '../../../../lib/auth-store';
import { orders } from '../../../../lib/api';
import { nextStatuses } from './state-machine';

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

const SHIPMENT_LABEL: Record<ShipmentRecord['status'], string> = {
  PENDING: 'Pending',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  RETURNED: 'Returned',
};

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const token = useAdminAuthStore((s) => s.accessToken);
  const [order, setOrder] = useState<AdminOrderListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Shipment
  const [shipStatus, setShipStatus] = useState<ShipmentRecord['status'] | ''>('');
  const [tracking, setTracking] = useState('');
  const [shipNote, setShipNote] = useState('');
  const [isShipping, setIsShipping] = useState(false);

  // Note
  const [noteContent, setNoteContent] = useState('');
  const [isNoteInternal, setIsNoteInternal] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    orders.admin
      .get(params.id, token)
      .then((o) => {
        if (!cancelled) {
          setOrder(o);
          setTracking(o.shipment?.trackingNumber ?? '');
        }
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
  }, [token, params.id, showError]);

  if (!token) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Sign in to view orders.</p>
      </AdminShell>
    );
  }
  if (isLoading || !order) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Loading order…</p>
      </AdminShell>
    );
  }

  const allowed = nextStatuses(order.status);

  async function handleUpdateStatus(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !newStatus) return;
    setIsUpdating(true);
    try {
      const fresh = await orders.admin.updateStatus(
        order!.id,
        { status: newStatus as OrderStatus, reason: statusReason || undefined },
        token,
      );
      setOrder(fresh);
      setNewStatus('');
      setStatusReason('');
      success(`Moved to ${STATUS_LABEL[newStatus]}`);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleUpdateShipment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setIsShipping(true);
    try {
      const fresh = await orders.admin.updateShipment(
        order!.id,
        {
          ...(shipStatus ? { status: shipStatus } : {}),
          ...(tracking ? { trackingNumber: tracking } : {}),
          ...(shipNote ? { notes: shipNote } : {}),
        },
        token,
      );
      setOrder(fresh);
      setShipStatus('');
      setShipNote('');
      success('Shipment updated');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Failed to update shipment');
    } finally {
      setIsShipping(false);
    }
  }

  async function handleAddNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !noteContent.trim()) return;
    setIsAddingNote(true);
    try {
      const fresh = await orders.admin.addNote(
        order!.id,
        { content: noteContent, isInternal: isNoteInternal },
        token,
      );
      setOrder(fresh);
      setNoteContent('');
      success('Note added');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:underline">
              ← All orders
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Items */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              <ul className="mt-3 divide-y">
                {order.items.map((it) => (
                  <li key={it.id} className="flex items-start gap-3 py-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
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

            {/* Status transition */}
            <form onSubmit={handleUpdateStatus} className="rounded-lg border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Move order</h3>
              {allowed.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  This order is in a final state and cannot be moved.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <FormField label="To status" htmlFor="newStatus">
                    <Select
                      id="newStatus"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    >
                      <option value="">Choose…</option>
                      {allowed.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Reason (optional)" htmlFor="reason">
                    <Input
                      id="reason"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="e.g. customer requested"
                    />
                  </FormField>
                  <div className="flex items-end">
                    <Button type="submit" isLoading={isUpdating} disabled={!newStatus}>
                      Update
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {/* Shipment */}
            <form onSubmit={handleUpdateShipment} className="rounded-lg border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Shipment</h3>
              {order.shipment && (
                <div className="mt-2 text-xs text-gray-500">
                  Status:{' '}
                  <span className="font-medium">{SHIPMENT_LABEL[order.shipment.status]}</span>
                  {order.shipment.trackingNumber && (
                    <>
                      {' '}
                      · Tracking:{' '}
                      <span className="font-medium">{order.shipment.trackingNumber}</span>
                    </>
                  )}
                </div>
              )}
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <FormField label="Status" htmlFor="shipStatus">
                  <Select
                    id="shipStatus"
                    value={shipStatus}
                    onChange={(e) => setShipStatus(e.target.value as ShipmentRecord['status'])}
                  >
                    <option value="">— no change —</option>
                    {(Object.keys(SHIPMENT_LABEL) as ShipmentRecord['status'][]).map((s) => (
                      <option key={s} value={s}>
                        {SHIPMENT_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Tracking number" htmlFor="tracking">
                  <Input
                    id="tracking"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="TRK-…"
                  />
                </FormField>
                <FormField label="Note" htmlFor="shipNote">
                  <Input
                    id="shipNote"
                    value={shipNote}
                    onChange={(e) => setShipNote(e.target.value)}
                    placeholder="Optional"
                  />
                </FormField>
              </div>
              <div className="mt-3">
                <Button type="submit" variant="outline" isLoading={isShipping}>
                  Update shipment
                </Button>
              </div>
            </form>

            {/* Notes */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
              {order.internalNotes.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No notes yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {order.internalNotes.map((n) => (
                    <li key={n.id} className="rounded border bg-gray-50 p-2">
                      <p className="text-gray-800">{n.content}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(n.createdAt).toLocaleString()} ·{' '}
                        {n.isInternal ? 'internal' : 'public'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddNote} className="mt-4 space-y-2">
                <FormField label="Add a note" htmlFor="note">
                  <Textarea
                    id="note"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                  />
                </FormField>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={isNoteInternal}
                    onChange={(e) => setIsNoteInternal(e.target.checked)}
                  />
                  Internal only
                </label>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isAddingNote}
                  disabled={!noteContent.trim()}
                >
                  Add note
                </Button>
              </form>
            </div>

            {/* Status history */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Status history</h3>
              <ol className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4 text-sm">
                {order.statusHistory.map((s, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-brand-primary" />
                    <p className="text-gray-900">
                      {s.fromStatus ? `${s.fromStatus} → ` : ''}
                      <span className="font-medium">{s.toStatus}</span>
                      {s.reason ? ` · ${s.reason}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(s.changedAt).toLocaleString()} · by {s.changedBy}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="space-y-4">
            {/* Customer */}
            {order.customer && (
              <div className="rounded-lg border bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
                <p className="mt-2 text-sm">
                  <span className="font-medium">
                    {order.customer.firstName} {order.customer.lastName}
                  </span>
                </p>
                <p className="text-xs text-gray-600">{order.customer.email}</p>
                {order.customer.phone && (
                  <p className="text-xs text-gray-600">{order.customer.phone}</p>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
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
            </div>

            {/* Payment */}
            <div className="rounded-lg border bg-white p-6 text-sm">
              <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
              <p className="mt-2">
                <span className="font-medium">{order.payment.method}</span> · {order.payment.status}
              </p>
              {order.payment.paidAt && (
                <p className="text-xs text-gray-500">
                  Paid: {new Date(order.payment.paidAt).toLocaleString()}
                </p>
              )}
            </div>

            {/* Shipping address */}
            <div className="rounded-lg border bg-white p-6 text-sm">
              <h3 className="text-sm font-semibold text-gray-900">Ship to</h3>
              <p className="mt-2 font-medium">
                {order.shippingAddress.fullName} · {order.shippingAddress.phone}
              </p>
              <p className="text-xs text-gray-600">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2
                  ? `, ${order.shippingAddress.addressLine2}`
                  : ''}
              </p>
              <p className="text-xs text-gray-600">
                {order.shippingAddress.city}, {order.shippingAddress.district},{' '}
                {order.shippingAddress.division}
                {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
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
