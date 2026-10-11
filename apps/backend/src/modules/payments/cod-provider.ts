/**
 * Cash-on-delivery payment provider.
 *
 * Free, in-process, no external SDK. Money is realized when the courier
 * hands the package to the buyer and we mark the order DELIVERED - that
 * is when this provider flips the Payment row to VERIFIED and stamps
 * `paidAt`. (For a manual reconciliation flow you can also flip it from
 * the admin order detail page - see orders/service.ts#updateStatus.)
 */
import type { Prisma } from '@prisma/client';
import { BadRequestError } from '../../lib/errors';
import type { PaymentProvider, PaymentMethodContext } from './provider';

/** Hard cap on a single COD order, in BDT. Configurable later via SiteSetting. */
const COD_MAX_PAISA = 100_000 * 100; // ৳100,000

export const codPaymentProvider: PaymentProvider = {
  id: 'cod',

  validateMethod({ amountPaisa }) {
    if (amountPaisa > COD_MAX_PAISA) {
      throw new BadRequestError(
        `Cash on Delivery is only available for orders up to ৳${COD_MAX_PAISA / 100}. ` +
          `Please contact us for higher-value orders.`,
        { maxPaisa: COD_MAX_PAISA, requestedPaisa: amountPaisa },
      );
    }
  },

  async onOrderPlaced(_ctx: PaymentMethodContext, _tx: Prisma.TransactionClient) {
    // No session to create for COD; the Payment row is already PENDING.
  },

  async onOrderCancelled(ctx: PaymentMethodContext, reason: string) {
    // Best-effort update. The Payment row may have been deleted in test paths.
    // We don't have the transaction client here, so use a small raw update.
    const { prisma } = await import('@anzara/database');
    const payment = await prisma.payment.findUnique({ where: { id: ctx.paymentId } });
    if (payment && payment.status === 'PENDING') {
      await prisma.payment.update({
        where: { id: ctx.paymentId },
        data: { status: 'FAILED', failureReason: reason },
      });
    }
  },

  async onOrderDelivered(ctx: PaymentMethodContext, tx: Prisma.TransactionClient) {
    const payment = await tx.payment.findUnique({ where: { id: ctx.paymentId } });
    if (payment && payment.status === 'PENDING') {
      await tx.payment.update({
        where: { id: ctx.paymentId },
        data: { status: 'VERIFIED', paidAt: new Date() },
      });
    }
  },
};
