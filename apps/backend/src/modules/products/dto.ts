/**
 * Product DTO helpers.
 * Convert Prisma rows to the shared-types Product shape.
 */
import type {
  Category,
  Collection,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  ProductVariant as PrismaProductVariant,
} from '@prisma/client';
import type {
  Category as CategoryDto,
  Collection as CollectionDto,
  Product as ProductDto,
  ProductImage as ProductImageDto,
  ProductVariant as ProductVariantDto,
} from '@anzara/shared-types';

type WithRelations = PrismaProduct & {
  category?: Category | null;
  images?: PrismaProductImage[];
  variants?: PrismaProductVariant[];
  collections?: { collection: Collection }[];
};

export type { WithRelations };

export function toProductDto(p: WithRelations): ProductDto {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name as ProductDto['name'],
    description: p.description as ProductDto['description'],
    shortDescription: (p.shortDescription ?? undefined) as ProductDto['shortDescription'],
    status: p.status as ProductDto['status'],
    basePrice: { amount: p.basePrice, currency: 'BDT' },
    categoryId: p.categoryId,
    collectionIds: (p.collections ?? []).map((c) => c.collection.id),
    images: (p.images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(toProductImageDto),
    variants: (p.variants ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(toProductVariantDto),
    tags: p.tags,
    seoTitle: (p.seoTitle ?? undefined) as ProductDto['seoTitle'],
    seoDescription: (p.seoDescription ?? undefined) as ProductDto['seoDescription'],
    hasVariants: p.hasVariants,
    totalStock: (p.variants ?? []).reduce((sum, v) => sum + v.stockQuantity, 0),
    isFeatured: p.isFeatured,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toProductImageDto(img: PrismaProductImage): ProductImageDto {
  return {
    id: img.id,
    url: img.url,
    alt: img.alt,
    position: img.position,
    ...(img.width ? { width: img.width } : {}),
    ...(img.height ? { height: img.height } : {}),
  };
}

function toProductVariantDto(v: PrismaProductVariant): ProductVariantDto {
  return {
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    ...(v.size ? { size: v.size } : {}),
    ...(v.color ? { color: v.color } : {}),
    price: { amount: v.price, currency: 'BDT' },
    ...(v.compareAtPrice !== null && v.compareAtPrice !== undefined
      ? { compareAtPrice: { amount: v.compareAtPrice, currency: 'BDT' } }
      : {}),
    stockQuantity: v.stockQuantity,
    lowStockThreshold: v.lowStockThreshold,
    isActive: v.isActive,
    ...(v.weight ? { weight: v.weight } : {}),
  };
}

export function toCategoryDto(c: Category & { _count?: { products: number } }): CategoryDto {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name as CategoryDto['name'],
    description: (c.description ?? undefined) as CategoryDto['description'],
    ...(c.image ? { image: c.image } : {}),
    ...(c.parentId ? { parentId: c.parentId } : {}),
    position: c.position,
    isActive: c.isActive,
  };
}

export function toCollectionDto(
  c: Collection & { products?: { product: PrismaProduct }[] },
): CollectionDto {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name as CollectionDto['name'],
    description: (c.description ?? undefined) as CollectionDto['description'],
    ...(c.image ? { image: c.image } : {}),
    productIds: (c.products ?? []).map((p) => p.product.id),
    position: c.position,
    isActive: c.isActive,
    ...(c.startsAt ? { startsAt: c.startsAt.toISOString() } : {}),
    ...(c.endsAt ? { endsAt: c.endsAt.toISOString() } : {}),
  };
}
