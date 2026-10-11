/**
 * Cart totals calculation.
 *
 * Pure-ish: takes a subtotal + optional coupon discount, returns the final
 * totals. Shipping/tax come from SiteSetting. The cart service handles
 * coupon validation; this module only applies the resulting discount.
 * Currency: BDT, stored in paisa (1 BDT = 100 paisa).
 */
import { prisma } from '@anzara/database';

export interface CartTotalsInput {
  subtotalPaisa: number;
  /** Optional pre-computed coupon discount in paisa. */
  discountPaisa?: number;
}

export interface CartTotalsResult {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  notes: string[];
}

const CURRENCY = 'BDT';

async function readShippingFeePaisa(): Promise<number> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'shipping.flatFee' } });
  if (!row) return 0;
  const v = row.value as { paisa?: number } | null;
  return typeof v?.paisa === 'number' ? v.paisa : 0;
}

async function readFreeShippingThresholdPaisa(): Promise<number> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'shipping.freeOver' } });
  if (!row) return 0;
  const v = row.value as { paisa?: number } | null;
  return typeof v?.paisa === 'number' ? v.paisa : 0;
}

async function readTaxPercent(): Promise<number> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'tax.percent' } });
  if (!row) return 0;
  const v = row.value as { percent?: number } | null;
  if (typeof v?.percent !== 'number' || v.percent < 0) return 0;
  return Math.min(v.percent, 100);
}

export async function computeCartTotals(input: CartTotalsInput): Promise<CartTotalsResult> {
  const subtotal = Math.max(0, Math.floor(input.subtotalPaisa));
  const flatFee = await readShippingFeePaisa();
  const freeOver = await readFreeShippingThresholdPaisa();
  const taxPercent = await readTaxPercent();

  let shipping = flatFee;
  const notes: string[] = [];
  if (freeOver > 0 && subtotal >= freeOver) {
    shipping = 0;
    notes.push('Free shipping');
  } else if (flatFee > 0) {
    notes.push(`Flat shipping: ৳${(flatFee / 100).toFixed(0)}`);
  }

  const discount = Math.max(0, Math.min(input.discountPaisa ?? 0, subtotal));
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = taxPercent > 0 ? Math.floor((afterDiscount * taxPercent) / 100) : 0;
  if (taxPercent > 0) notes.push(`${taxPercent}% VAT`);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: afterDiscount + shipping + tax,
    notes,
  };
}

export const CURRENCY_CODE = CURRENCY;

/** Format a paisa amount as a BDT string. */
export function formatBDT(paisa: number): string {
  const taka = paisa / 100;
  return `৳${taka.toFixed(2)}`;
}
