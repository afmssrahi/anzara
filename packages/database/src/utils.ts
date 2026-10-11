/**
 * Database utility helpers.
 */
import { Prisma } from '@prisma/client';

/** Build a unique order number, e.g. ANZ-2026-000123 */
export function buildOrderNumber(
  sequence: number,
  year: number = new Date().getFullYear(),
): string {
  const padded = sequence.toString().padStart(6, '0');
  return `ANZ-${year}-${padded}`;
}

/** Generate a random SKU prefix. */
export function generateSkuPrefix(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Prisma transaction helper with proper typing. */
export async function withTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const { prisma } = await import('./client');
  return prisma.$transaction(callback);
}
