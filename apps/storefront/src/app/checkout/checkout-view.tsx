'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import type { Cart, UserAddress } from '@anzara/shared-types';
import { Button, FormField, Input, Select, Textarea, formatBDT, useT, useToast } from '@anzara/ui';
import { addresses, cart as cartApi, orders, payments } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';

type Mode = 'pick' | 'new';

interface AddressForm {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  division: string;
  postalCode: string;
}

const EMPTY_ADDR: AddressForm = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  division: '',
  postalCode: '',
};

export function CheckoutView() {
  const router = useRouter();
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [cartData, setCartData] = useState<Cart | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [enabledMethods, setEnabledMethods] = useState<Array<{ id: string; label: string }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('COD');
  const [mode, setMode] = useState<Mode>('pick');
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState<AddressForm>({
    ...EMPTY_ADDR,
    fullName: user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '',
    phone: user?.phone ?? '',
  });
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login?return=/checkout');
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const [c, addrs, pm] = await Promise.all([
          cartApi.get(accessToken),
          addresses.list(accessToken).catch(() => [] as UserAddress[]),
          payments.enabled().catch(() => ({
            methods: [{ id: 'COD', label: 'Cash on Delivery', provider: 'cod' }],
            currency: 'BDT' as const,
          })),
        ]);
        if (cancelled) return;
        setCartData(c);
        setSavedAddresses(addrs);
        setEnabledMethods(pm.methods);
        // Default to the first enabled method (today: only COD).
        if (pm.methods[0]) setPaymentMethod(pm.methods[0].id);
        const def = addrs.find((a: UserAddress) => a.isDefault) ?? addrs[0];
        if (def) setSelectedId(def.id);
        else setMode('new');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, router, user]);

  if (!accessToken || isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-gray-500">Loading…</div>;
  }
  if (!cartData || cartData.items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold">Checkout</h1>
        <p className="text-gray-500">Your cart is empty.</p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm text-brand-primary hover:underline"
        >
          Browse products →
        </Link>
      </main>
    );
  }

  async function handlePlaceOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    let shippingAddress: AddressForm | UserAddress | null = null;
    if (mode === 'pick') {
      shippingAddress = savedAddresses.find((a) => a.id === selectedId) ?? null;
      if (!shippingAddress) {
        showError('Please choose a shipping address');
        return;
      }
    } else {
      // Validate the new address inline before submitting.
      const missing = (
        ['fullName', 'phone', 'addressLine1', 'city', 'district', 'division'] as const
      ).filter((k) => !form[k].trim());
      if (missing.length > 0) {
        showError(`Please fill: ${missing.join(', ')}`);
        return;
      }
      shippingAddress = form;
    }
    setIsSubmitting(true);
    try {
      // The backend rejects methods that aren't currently enabled. Today
      // the only option is COD, so this is effectively `as 'COD'`, but
      // we cast at the boundary so future providers (SSLCommerz, bKash,
      // Nagad) can flow through without touching the storefront.
      const order = await orders.place(
        {
          paymentMethod: paymentMethod as 'COD' | 'BKASH' | 'NAGAD' | 'CARD' | 'ROCKET',
          shippingAddress: normalizeForApi(shippingAddress),
          ...(note.trim() ? { customerNote: note.trim() } : {}),
        },
        accessToken,
      );
      success('Order placed!');
      router.push(`/orders/${order.id}?placed=1`);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not place order');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>
      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          {/* Shipping address */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900">Shipping address</h2>
            {savedAddresses.length > 0 && (
              <div className="mt-3 flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setMode('pick')}
                  className={
                    mode === 'pick'
                      ? 'rounded-md bg-brand-primary px-3 py-1.5 text-white'
                      : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700'
                  }
                >
                  Use saved
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={
                    mode === 'new'
                      ? 'rounded-md bg-brand-primary px-3 py-1.5 text-white'
                      : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700'
                  }
                >
                  New address
                </button>
              </div>
            )}
            <div className="mt-4">
              {mode === 'pick' && savedAddresses.length > 0 ? (
                <div className="space-y-2">
                  {savedAddresses.map((a) => (
                    <label
                      key={a.id}
                      className={
                        selectedId === a.id
                          ? 'flex cursor-pointer gap-3 rounded-md border-2 border-brand-primary bg-orange-50/30 p-3'
                          : 'flex cursor-pointer gap-3 rounded-md border border-gray-200 p-3 hover:border-gray-300'
                      }
                    >
                      <input
                        type="radio"
                        name="address"
                        value={a.id}
                        checked={selectedId === a.id}
                        onChange={() => setSelectedId(a.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {a.fullName} · {a.phone}
                        </p>
                        <p className="text-gray-600">
                          {a.addressLine1}
                          {a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.district},{' '}
                          {a.division}
                          {a.postalCode ? ` ${a.postalCode}` : ''}
                        </p>
                        {a.isDefault && (
                          <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <NewAddressForm form={form} setForm={setForm} />
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900">Payment method</h2>
            <div className="mt-3 space-y-2">
              {enabledMethods.map((m) => (
                <label
                  key={m.id}
                  className={
                    paymentMethod === m.id
                      ? 'flex cursor-pointer gap-3 rounded-md border-2 border-brand-primary bg-orange-50/30 p-3'
                      : 'flex cursor-pointer gap-3 rounded-md border border-gray-200 p-3 hover:border-gray-300'
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{m.label}</p>
                    {m.id === 'COD' && (
                      <p className="text-gray-600">Pay with cash when your order is delivered.</p>
                    )}
                  </div>
                </label>
              ))}
              {enabledMethods.length === 0 && (
                <p className="text-sm text-gray-500">Loading payment methods…</p>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900">Order note</h2>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything we should know? (optional)"
              rows={3}
              className="mt-3"
            />
          </div>

          {/* Items */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900">Items</h2>
            <ul className="mt-3 divide-y">
              {cartData.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                  <div className="h-12 w-12 overflow-hidden rounded bg-gray-100">
                    {it.image ? (
                      <img
                        src={it.image.url}
                        alt={it.image.alt}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{it.productName}</p>
                    <p className="text-xs text-gray-500">
                      {[it.size ? `Size ${it.size}` : null, it.color ? it.color : null]
                        .filter(Boolean)
                        .join(' · ')}{' '}
                      × {it.quantity}
                    </p>
                  </div>
                  <p className="font-medium">{formatBDT(it.subtotal.amount, locale)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="h-fit rounded-lg border bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Summary</h2>
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
          <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-900">
              {enabledMethods.find((m) => m.id === paymentMethod)?.label ?? paymentMethod}
            </p>
            {paymentMethod === 'COD' ? (
              <p>Pay ৳{(cartData.total.amount / 100).toFixed(2)} when your order arrives.</p>
            ) : (
              <p>You'll be redirected to the payment gateway after placing the order.</p>
            )}
          </div>
          <Button type="submit" fullWidth size="lg" className="mt-6" isLoading={isSubmitting}>
            Place order
          </Button>
        </aside>
      </form>
    </main>
  );
}

function NewAddressForm({
  form,
  setForm,
}: {
  form: AddressForm;
  setForm: (f: AddressForm) => void;
}) {
  function update<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setForm({ ...form, [key]: value });
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormField label="Full name" htmlFor="fullName" required>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          required
        />
      </FormField>
      <FormField label="Phone" htmlFor="phone" hint="+8801XXXXXXXXX" required>
        <Input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          required
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Address line 1" htmlFor="line1" required>
          <Input
            id="line1"
            value={form.addressLine1}
            onChange={(e) => update('addressLine1', e.target.value)}
            required
          />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormField label="Address line 2" htmlFor="line2">
          <Input
            id="line2"
            value={form.addressLine2}
            onChange={(e) => update('addressLine2', e.target.value)}
          />
        </FormField>
      </div>
      <FormField label="City" htmlFor="city" required>
        <Input
          id="city"
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          required
        />
      </FormField>
      <FormField label="District" htmlFor="district" required>
        <Input
          id="district"
          value={form.district}
          onChange={(e) => update('district', e.target.value)}
          required
        />
      </FormField>
      <FormField label="Division" htmlFor="division" required>
        <Select
          id="division"
          value={form.division}
          onChange={(e) => update('division', e.target.value)}
          required
        >
          <option value="">Select…</option>
          {[
            'Dhaka',
            'Chattogram',
            'Rajshahi',
            'Khulna',
            'Barishal',
            'Sylhet',
            'Rangpur',
            'Mymensingh',
          ].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Postal code" htmlFor="postal">
        <Input
          id="postal"
          value={form.postalCode}
          onChange={(e) => update('postalCode', e.target.value)}
        />
      </FormField>
    </div>
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

/** Strip fields the server doesn't want, and normalize for the API. */
function normalizeForApi(input: AddressForm | UserAddress) {
  return {
    fullName: input.fullName,
    phone: input.phone,
    addressLine1: input.addressLine1,
    ...('addressLine2' in input && input.addressLine2 ? { addressLine2: input.addressLine2 } : {}),
    city: input.city,
    district: input.district,
    division: input.division,
    ...('postalCode' in input && input.postalCode ? { postalCode: input.postalCode } : {}),
    country: 'country' in input ? (input as UserAddress).country : 'Bangladesh',
  };
}
