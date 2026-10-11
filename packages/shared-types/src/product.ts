/**
 * Product catalog types.
 */
import type { ISODateString, LocalizedString, Money } from './common';

export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  position: number;
  width?: number;
  height?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  size?: string;
  color?: string;
  price: Money;
  compareAtPrice?: Money;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  weight?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  shortDescription?: LocalizedString;
  status: ProductStatus;
  basePrice: Money;
  categoryId: string;
  collectionIds: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  tags: string[];
  seoTitle?: LocalizedString;
  seoDescription?: LocalizedString;
  hasVariants: boolean;
  totalStock: number;
  isFeatured: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedString;
  description?: LocalizedString;
  image?: string;
  parentId?: string;
  position: number;
  isActive: boolean;
}

export interface Collection {
  id: string;
  slug: string;
  name: LocalizedString;
  description?: LocalizedString;
  image?: string;
  productIds: string[];
  position: number;
  isActive: boolean;
  startsAt?: ISODateString;
  endsAt?: ISODateString;
}

export interface ProductFilter {
  categoryId?: string;
  collectionId?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  search?: string;
}
