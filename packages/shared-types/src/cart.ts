/**
 * Shopping cart types.
 */
import type { ISODateString, Money } from './common';
import type { ProductImage } from './product';

export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantSku: string;
  size?: string;
  color?: string;
  image?: ProductImage;
  unitPrice: Money;
  quantity: number;
  subtotal: Money;
  maxQuantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: Money;
  discount: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  appliedCouponCode?: string;
  itemCount: number;
  reservedUntil?: ISODateString;
  updatedAt: ISODateString;
}
