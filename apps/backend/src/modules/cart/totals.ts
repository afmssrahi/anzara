/**
 * Cart totals calculation.
 *
 * For MVP (Phase 3) shipping and tax are zero. The shape mirrors what
 * the admin settings will produce (flat shipping per zone, optional tax
 * percent), so swapping in real rules later is a one-file change.
 *
 * Currency: BDT only, stored in paisa (1 BDT = 100 paisa).
 */
import { prisma } from '@anzara/database';

export interface CartTotalsInput {
  subtotalPaisa: number;
}

export interface CartTotalsResult {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  /** Free-form notes for the UI ("Free shipping over ৳5000"). */
  notes: string[];
}

const CURRENCY = 'BDT';

async function readShippingFeePaisa(): Promise<number> {
  // SiteSetting key "shipping.flatFee" — value is JSON (e.g. `{"paisa": 6000}`).
  // Missing -> 0 shipping.
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

export async function computeCartTotals(input: CartTotalsInput): Promise<CartTotalsResult> {
  const subtotal = Math.max(0, Math.floor(input.subtotalPaisa));
  const flatFee = await readShippingFeePaisa();
  const freeOver = await readFreeShippingThresholdPaisa();

  let shipping = flatFee;
  const notes: string[] = [];
  if (freeOver > 0 && subtotal >= freeOver) {
    shipping = 0;
    notes.push('Free shipping');
  } else if (flatFee > 0) {
    notes.push(`Flat shipping: ৳${(flatFee / 100).toFixed(0)}`);
  }

  return {
    subtotal,
    discount: 0,
    shipping,
    tax: 0,
    total: subtotal + shipping,
    notes,
  };
}

export const CURRENCY_CODE = CURRENCY;

/** Format a paisa amount as a BDT string. */
export function formatBDT(paisa: number): string {
  const taka = paisa / 100;
  return `৳${taka.toFixed(2)}`;
}
