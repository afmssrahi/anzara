/**
 * Reviews module - business logic.
 *
 * Public surface:
 *   - listForProduct(productId) -> paginated, approved-only reviews + summary
 *
 * Customer surface:
 *   - create(userId, input)   - one review per user per product, must be a buyer
 *   - updateMine / deleteMine
 *
 * Admin surface:
 *   - listForAdmin(filter)
 *   - moderate(id, { isApproved, isFeatured, isVerified })
 *   - delete(id)
 */
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors';
import { recordAudit } from '../../lib/audit';
import { logger } from '../../lib/logger';
import { reviewsRepository } from './repository';
import { toAdminReviewDto, toReviewDto, toReviewSummary } from './dto';
import type {
  CreateReviewInput,
  ModerateReviewInput,
  ReviewFilterInput,
  UpdateReviewInput,
} from './validators';
import type { Review, ReviewSummary } from '@anzara/shared-types';

export const reviewsService = {
  // ----------------------------------------------------------------
  // Public
  // ----------------------------------------------------------------
  async listForProduct(productId: string, page: number, limit: number) {
    const { items, total } = await reviewsRepository.listForProduct(productId, { page, limit });
    const summary = await reviewsRepository.summaryForProduct(productId);
    return {
      data: items.map((it) => toReviewDto(it)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      summary: toReviewSummary(summary),
    };
  },

  async summary(productId: string): Promise<ReviewSummary> {
    return toReviewSummary(await reviewsRepository.summaryForProduct(productId));
  },

  // ----------------------------------------------------------------
  // Customer
  // ----------------------------------------------------------------
  async create(userId: string, input: CreateReviewInput): Promise<Review> {
    // 1. Has the user purchased this product?
    const purchased = await reviewsRepository.hasPurchased(userId, input.productId);
    if (!purchased) {
      throw new BadRequestError('You can only review products you have purchased and received');
    }
    // 2. One review per user per product.
    const existing = await reviewsRepository.findByUserAndProduct(userId, input.productId);
    if (existing) {
      throw new ConflictError('You have already reviewed this product');
    }
    const created = await reviewsRepository.create({
      productId: input.productId,
      userId,
      rating: input.rating,
      title: input.title ?? null,
      comment: input.comment,
      images: input.images,
      // New reviews are auto-verified (buyer) but NOT auto-approved.
      // Moderation keeps the storefront clean.
      isVerified: true,
      isApproved: false,
    });
    return toReviewDto(created);
  },

  async updateMine(userId: string, reviewId: string, input: UpdateReviewInput) {
    const existing = await reviewsRepository.findById(reviewId);
    if (!existing) throw new NotFoundError('Review not found');
    if (existing.userId !== userId) throw new BadRequestError('You can only edit your own review');
    const updated = await reviewsRepository.update(reviewId, {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
    });
    return toReviewDto(updated);
  },

  async deleteMine(userId: string, reviewId: string) {
    const existing = await reviewsRepository.findById(reviewId);
    if (!existing) throw new NotFoundError('Review not found');
    if (existing.userId !== userId)
      throw new BadRequestError('You can only delete your own review');
    await reviewsRepository.delete(reviewId);
  },

  // ----------------------------------------------------------------
  // Admin
  // ----------------------------------------------------------------
  async listForAdmin(query: ReviewFilterInput) {
    const { items, total } = await reviewsRepository.listForAdmin({
      page: query.page,
      limit: query.limit,
      ...(query.isApproved !== undefined ? { isApproved: query.isApproved } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return {
      data: items.map((it) => toAdminReviewDto(it)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  },

  async moderate(
    adminId: string,
    reviewId: string,
    input: ModerateReviewInput,
  ): Promise<ReturnType<typeof toAdminReviewDto>> {
    const existing = await reviewsRepository.findById(reviewId);
    if (!existing) throw new NotFoundError('Review not found');
    const updated = await reviewsRepository.update(reviewId, {
      ...(input.isApproved !== undefined ? { isApproved: input.isApproved } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.isVerified !== undefined ? { isVerified: input.isVerified } : {}),
    });
    try {
      await recordAudit({
        adminId,
        action: 'review.moderate',
        entity: 'Review',
        entityId: reviewId,
        metadata: input,
      });
    } catch (err) {
      logger.warn({ err, reviewId }, 'Failed to record review.moderate audit');
    }
    return toAdminReviewDto(updated);
  },

  async delete(adminId: string, reviewId: string) {
    const existing = await reviewsRepository.findById(reviewId);
    if (!existing) throw new NotFoundError('Review not found');
    await reviewsRepository.delete(reviewId);
    try {
      await recordAudit({
        adminId,
        action: 'review.delete',
        entity: 'Review',
        entityId: reviewId,
      });
    } catch (err) {
      logger.warn({ err, reviewId }, 'Failed to record review.delete audit');
    }
  },
};
