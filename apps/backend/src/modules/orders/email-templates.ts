/**
 * Email templates for the orders module.
 *
 * Pure functions: input -> { subject, html, text }. No I/O. The orders
 * service calls them and hands the result to `emailService`. Keeping
 * templates out of the service file means they can be iterated on
 * (BN translations, brand color, layout) without touching business logic.
 */
import type { OrderStatus } from '@anzara/shared-types';

const BRAND = {
  name: 'Anzara',
  color: '#0F4C5C',
};

const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
const headingStyle = `color: ${BRAND.color}; margin: 0 0 24px;`;

const STATUS_BODY: Record<OrderStatus, string> = {
  PENDING:
    "We've received your order and it's waiting to be confirmed. " +
    'Our team usually confirms within a few business hours.',
  AWAITING_CONFIRMATION: "We've received your order and it's waiting to be confirmed.",
  CONFIRMED: 'Your order is confirmed and will be packed soon.',
  PROCESSING: 'Your order is being packed and prepared for dispatch.',
  SHIPPED: 'Your order is on its way! Track it using the link in your order page.',
  DELIVERED:
    'Your order has been delivered. If anything is off, please reply to this email ' +
    'or contact us via the help page.',
  CANCELLED: 'Your order has been cancelled as requested. No payment was captured.',
  RETURN_REQUESTED: 'Your return request has been received and is being reviewed.',
  RETURNED: 'Your return has been received at our warehouse. Refund is being processed.',
  REFUNDED: 'Your refund has been processed. It may take 3-5 business days to appear.',
};

export interface OrderEmail {
  subject: string;
  html: string;
  text: string;
}

export function orderConfirmationEmail(args: {
  orderNumber: string;
  totalPaisa: number;
  firstName: string;
  paymentMethod: string;
}): OrderEmail {
  const total = (args.totalPaisa / 100).toFixed(2);
  const isCod = args.paymentMethod === 'COD';
  const paymentLine = isCod
    ? `Total: <strong>৳${total}</strong> (Cash on Delivery).`
    : `Total: <strong>৳${total}</strong> (${args.paymentMethod}).`;

  return {
    subject: `Order ${args.orderNumber} received`,
    html: `
      <div style="${baseStyle}">
        <h1 style="${headingStyle}">${BRAND.name}</h1>
        <p style="color: #333; font-size: 16px;">Hi ${args.firstName},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Thanks for your order! Your order number is
          <strong style="color:${BRAND.color};">${args.orderNumber}</strong>.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">${paymentLine}</p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          We'll email you again when your order is confirmed and once it ships.
        </p>
      </div>
    `,
    text:
      `Hi ${args.firstName},\n\nThanks for your order ${args.orderNumber}. ` +
      `Total: ৳${total} (${args.paymentMethod}).\n` +
      `We'll email you when it ships.`,
  };
}

export function orderStatusEmail(args: {
  orderNumber: string;
  status: OrderStatus;
  firstName: string;
}): OrderEmail {
  const body = STATUS_BODY[args.status];
  return {
    subject: `Order ${args.orderNumber} is now ${args.status}`,
    html: `
      <div style="${baseStyle}">
        <h1 style="${headingStyle}">${BRAND.name}</h1>
        <p style="color: #333; font-size: 16px;">Hi ${args.firstName},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your order <strong>${args.orderNumber}</strong> is now <strong>${args.status}</strong>.
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">${body}</p>
      </div>
    `,
    text: `Hi ${args.firstName},\n\nYour order ${args.orderNumber} is now "${args.status}".\n\n${body}`,
  };
}
