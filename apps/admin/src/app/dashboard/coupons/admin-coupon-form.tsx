'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import type { AdminCoupon, DiscountType } from '@anzara/api-client';
import { Button, FormField, Input, Select, Textarea, useToast } from '@anzara/ui';
import { coupons } from '../../../lib/api';
import { useAdminAuthStore } from '../../../lib/auth-store';

interface FormState {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  firstOrderOnly: boolean;
}

const EMPTY: FormState = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '10',
  minOrderAmount: '0',
  maxDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
  firstOrderOnly: false,
};

function fromDto(c: AdminCoupon): FormState {
  return {
    code: c.code,
    description: c.description ?? '',
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    minOrderAmount: String(c.minOrderAmount),
    maxDiscountAmount: c.maxDiscountAmount !== null ? String(c.maxDiscountAmount) : '',
    usageLimit: c.usageLimit !== null ? String(c.usageLimit) : '',
    perUserLimit: c.perUserLimit !== null ? String(c.perUserLimit) : '',
    startsAt: c.startsAt ? c.startsAt.slice(0, 16) : '',
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : '',
    isActive: c.isActive,
    firstOrderOnly: c.firstOrderOnly,
  };
}

export default function AdminCouponForm() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const isEdit = Boolean(params.id);
  const { success, error: showError } = useToast();
  const accessToken = useAdminAuthStore((s) => s.accessToken);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !accessToken) return;
    setIsLoading(true);
    coupons
      .get(params.id as string, accessToken)
      .then((c) => setForm(fromDto(c)))
      .catch((err) => {
        if (err instanceof ApiError) showError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, isEdit, params.id, showError]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const code = form.code.trim().toUpperCase();
    if (!code) {
      showError('Code is required');
      return;
    }
    const discountValue = Number(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      showError('Discount value must be a positive number');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      showError('PERCENTAGE discount cannot exceed 100');
      return;
    }

    const body: Parameters<typeof coupons.create>[0] = {
      code,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      discountType: form.discountType,
      discountValue,
      minOrderAmount: Number(form.minOrderAmount || 0),
      ...(form.maxDiscountAmount ? { maxDiscountAmount: Number(form.maxDiscountAmount) } : {}),
      ...(form.usageLimit ? { usageLimit: Number(form.usageLimit) } : {}),
      ...(form.perUserLimit ? { perUserLimit: Number(form.perUserLimit) } : {}),
      ...(form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}),
      ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
      isActive: form.isActive,
      firstOrderOnly: form.firstOrderOnly,
      productIds: [],
      categoryIds: [],
    };

    setIsSaving(true);
    try {
      if (isEdit) {
        await coupons.update(params.id as string, body, accessToken);
        success('Coupon updated');
      } else {
        await coupons.create(body, accessToken);
        success('Coupon created');
      }
      router.push('/dashboard/coupons');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not save coupon');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/coupons" className="text-sm text-brand-primary hover:underline">
          ← Back to coupons
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{isEdit ? `Edit ${form.code}` : 'New coupon'}</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" hint="A-Z, 0-9, '-' or '_' only">
            <Input
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="EID25"
              maxLength={50}
              required
            />
          </FormField>
          <FormField label="Discount type">
            <Select
              value={form.discountType}
              onChange={(e) => set('discountType', e.target.value as DiscountType)}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount (paisa)</option>
            </Select>
          </FormField>
        </div>

        <FormField
          label={form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount (paisa)'}
        >
          <Input
            type="number"
            min="1"
            max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
            value={form.discountValue}
            onChange={(e) => set('discountValue', e.target.value)}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Min order (paisa)" hint="0 = no minimum">
            <Input
              type="number"
              min="0"
              value={form.minOrderAmount}
              onChange={(e) => set('minOrderAmount', e.target.value)}
            />
          </FormField>
          {form.discountType === 'PERCENTAGE' && (
            <FormField label="Max discount (paisa)" hint="Cap the % off">
              <Input
                type="number"
                min="1"
                value={form.maxDiscountAmount}
                onChange={(e) => set('maxDiscountAmount', e.target.value)}
                placeholder="optional"
              />
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Usage limit (total)" hint="blank = unlimited">
            <Input
              type="number"
              min="1"
              value={form.usageLimit}
              onChange={(e) => set('usageLimit', e.target.value)}
              placeholder="e.g. 100"
            />
          </FormField>
          <FormField label="Per-user limit" hint="blank = unlimited">
            <Input
              type="number"
              min="1"
              value={form.perUserLimit}
              onChange={(e) => set('perUserLimit', e.target.value)}
              placeholder="e.g. 1"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Starts at" hint="optional">
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
            />
          </FormField>
          <FormField label="Expires at" hint="optional">
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => set('expiresAt', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Description" hint="Shown in the cart when applied">
          <Textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Eid sale — 10% off everything"
          />
        </FormField>

        <div className="flex flex-col gap-3 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.firstOrderOnly}
              onChange={(e) => set('firstOrderOnly', e.target.checked)}
              className="h-4 w-4"
            />
            First-order only
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
          <Link href="/dashboard/coupons">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isSaving}>
            {isEdit ? 'Save changes' : 'Create coupon'}
          </Button>
        </div>
      </form>
    </div>
  );
}
