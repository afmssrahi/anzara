/**
 * Reviews, wishlist, and content types.
 */
import type { ISODateString, LocalizedString } from './common';

export interface Review {
  id: string;
  productId: string;
  userId: string;
  /** Display name (first name + last initial) for the review card. */
  userDisplayName: string;
  rating: number; // 1-5
  title: string | null;
  comment: string;
  isVerified: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  images: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ReviewSummary {
  productId: string;
  count: number;
  average: number; // 0-5, 0 if no reviews
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface WishlistItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: LocalizedString;
  productImage: string | null;
  basePrice: { amount: number; currency: 'BDT' };
  createdAt: ISODateString;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface Page {
  id: string;
  slug: string;
  title: LocalizedString;
  content: LocalizedString;
  isPublished: boolean;
  updatedAt: ISODateString;
}

/** Public-facing settings. Only `isPublic = true` rows are returned. */
export type PublicSettings = Record<string, unknown>;
