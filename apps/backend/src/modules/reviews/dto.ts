/**
 * Reviews DTO helpers.
 */
import type { Review as PrismaReview } from '@prisma/client';
import type { Review, ReviewSummary } from '@anzara/shared-types';

type ReviewWithUser = PrismaReview & {
  user: { id: string; firstName: string; lastName: string };
};

type AdminReview = PrismaReview & {
  user: { id: string; firstName: string; lastName: string };
  product?: {
    id: string;
    slug: string;
    /** Localized JSON, typed as unknown here to avoid Prisma's `JsonValue` union leaking in. */
    name: unknown;
    images: { url: string }[];
  };
};

function displayName(u: { firstName: string; lastName: string }): string {
  const last = u.lastName?.trim();
  if (!last) return u.firstName;
  return `${u.firstName} ${last[0]}.`;
}

export function toReviewDto(r: ReviewWithUser): Review {
  return {
    id: r.id,
    productId: r.productId,
    userId: r.userId,
    userDisplayName: displayName(r.user),
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    isVerified: r.isVerified,
    isApproved: r.isApproved,
    isFeatured: r.isFeatured,
    images: r.images,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export interface AdminReviewDto extends Review {
  productSlug?: string;
  productName?: string;
  productImage?: string;
  customerEmail?: string;
}

export function toAdminReviewDto(r: AdminReview): AdminReviewDto {
  return {
    ...toReviewDto(r),
    ...(r.product
      ? {
          productSlug: r.product.slug,
          productName: pickLocalized(r.product.name),
          productImage: r.product.images[0]?.url,
        }
      : {}),
  };
}

function pickLocalized(name: unknown): string {
  if (typeof name !== 'object' || name === null) return '';
  const obj = name as Record<string, unknown>;
  if (typeof obj['en'] === 'string') return obj['en'];
  if (typeof obj['bn'] === 'string') return obj['bn'];
  return '';
}

export function toReviewSummary(s: {
  productId: string;
  count: number;
  average: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}): ReviewSummary {
  return s;
}
