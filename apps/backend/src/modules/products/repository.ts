/**
 * Products module - data access layer.
 * All Prisma queries for products live here.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';
import { getSearchProvider } from '../search/factory';

export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ListFilters {
  page: number;
  limit: number;
  sort: string;
  status?: ProductStatus;
  categoryId?: string;
  collectionId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  search?: string;
  isFeatured?: boolean;
}

function buildOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'createdAt':
      return { createdAt: 'asc' };
    case 'basePrice':
      return { basePrice: 'asc' };
    case '-basePrice':
      return { basePrice: 'desc' };
    case 'name':
      return { name: 'asc' };
    case '-name':
      return { name: 'desc' };
    case '-createdAt':
    default:
      return { createdAt: 'desc' };
  }
}

function buildWhere(filters: ListFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.isFeatured !== undefined) where.isFeatured = filters.isFeatured;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.basePrice = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.inStock) {
    where.OR = [
      { hasVariants: false, variants: { some: { stockQuantity: { gt: 0 } } } },
      { hasVariants: true, variants: { some: { stockQuantity: { gt: 0 } } } },
    ];
  }
  if (filters.sizes && filters.sizes.length > 0) {
    where.variants = { some: { size: { in: filters.sizes } } };
  }
  if (filters.colors && filters.colors.length > 0) {
    where.variants = { some: { color: { in: filters.colors } } };
  }
  if (filters.collectionId) {
    where.collections = { some: { collectionId: filters.collectionId } };
  }

  // Combine the free-text search fragment with the rest of the where via AND
  // so we never blow away caller filters (category, inStock, etc.).
  if (filters.search && filters.search.trim().length > 0) {
    const hit = getSearchProvider().searchProducts(filters.search);
    if (hit) {
      return { AND: [where, hit.where] };
    }
  }
  return where;
}

const PUBLIC_INCLUDE = {
  category: true,
  images: { orderBy: { position: 'asc' as const } },
  variants: { orderBy: { position: 'asc' as const } },
  collections: { include: { collection: true } },
} satisfies Prisma.ProductInclude;

export const productsRepository = {
  async list(filters: ListFilters) {
    const where = buildWhere(filters);
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: buildOrderBy(filters.sort),
        skip,
        take: filters.limit,
        include: PUBLIC_INCLUDE,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: PUBLIC_INCLUDE,
    });
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: PUBLIC_INCLUDE,
    });
  },

  findBySlugPublic(slug: string) {
    return prisma.product.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: PUBLIC_INCLUDE,
    });
  },

  async createWithRelations(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data, include: PUBLIC_INCLUDE });
  },

  async updateWithRelations(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data, include: PUBLIC_INCLUDE });
  },

  remove(id: string) {
    return prisma.product.delete({ where: { id } });
  },

  async setVariants(
    productId: string,
    variants: Omit<Prisma.ProductVariantCreateManyInput, 'productId'>[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId } });
      if (variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v) => ({ ...v, productId })),
        });
      }
    });
  },

  async setImages(
    productId: string,
    images: Omit<Prisma.ProductImageCreateManyInput, 'productId'>[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } });
      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((i) => ({ ...i, productId })),
        });
      }
    });
  },

  async setCollections(productId: string, collectionIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.collectionProduct.deleteMany({ where: { productId } });
      if (collectionIds.length > 0) {
        await tx.collectionProduct.createMany({
          data: collectionIds.map((collectionId, position) => ({
            collectionId,
            productId,
            position,
          })),
        });
      }
    });
  },
};
