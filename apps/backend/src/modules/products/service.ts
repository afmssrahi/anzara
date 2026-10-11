/**
 * Products module - business logic.
 */
import { ConflictError, NotFoundError } from '../../lib/errors';
import { productsRepository, type ListFilters } from './repository';
import { toProductDto, type WithRelations } from './dto';
import type { CreateProductInput, UpdateProductInput, ProductListQuery } from './validators';

function asWithRelations(p: unknown): WithRelations {
  return p as WithRelations;
}

export const productsService = {
  async list(filters: ProductListQuery) {
    const repoFilters: ListFilters = { ...filters };
    const { items, total } = await productsRepository.list(repoFilters);
    const page = filters.page;
    const limit = filters.limit;
    return {
      data: items.map(asWithRelations).map(toProductDto),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  },

  async listFeatured(limit = 8) {
    const { items } = await productsRepository.list({
      page: 1,
      limit,
      sort: '-createdAt',
      status: 'PUBLISHED',
      isFeatured: true,
    });
    return items.map(asWithRelations).map(toProductDto);
  },

  async getBySlug(slug: string) {
    const product = await productsRepository.findBySlugPublic(slug);
    if (!product) throw new NotFoundError('Product not found');
    return toProductDto(asWithRelations(product));
  },

  async getById(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return toProductDto(asWithRelations(product));
  },

  async create(input: CreateProductInput) {
    const existing = await productsRepository.findBySlug(input.slug);
    if (existing) throw new ConflictError(`Product slug already exists: ${input.slug}`);

    const product = await productsRepository.createWithRelations({
      slug: input.slug,
      name: input.name,
      description: input.description,
      shortDescription: input.shortDescription ?? undefined,
      status: input.status,
      basePrice: input.basePrice,
      category: { connect: { id: input.categoryId } },
      hasVariants: input.hasVariants,
      isFeatured: input.isFeatured,
      tags: input.tags,
      seoTitle: input.seoTitle ?? undefined,
      seoDescription: input.seoDescription ?? undefined,
    });

    if (input.variants.length > 0) {
      await productsRepository.setVariants(
        product.id,
        input.variants.map((v) => ({
          sku: v.sku,
          size: v.size ?? null,
          color: v.color ?? null,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          stockQuantity: v.stockQuantity,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
          weight: v.weight ?? null,
          position: v.position,
        })),
      );
    }
    if (input.images.length > 0) {
      await productsRepository.setImages(
        product.id,
        input.images.map((i) => ({
          url: i.url,
          publicId: i.publicId ?? null,
          alt: i.alt,
          position: i.position,
          width: i.width ?? null,
          height: i.height ?? null,
        })),
      );
    }
    if (input.collectionIds.length > 0) {
      await productsRepository.setCollections(product.id, input.collectionIds);
    }

    return this.getById(product.id);
  },

  async update(id: string, input: UpdateProductInput) {
    await this.getById(id);
    if (input.slug) {
      const existing = await productsRepository.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Product slug already exists: ${input.slug}`);
      }
    }
    await productsRepository.updateWithRelations(id, {
      slug: input.slug ?? undefined,
      name: input.name ?? undefined,
      description: input.description ?? undefined,
      shortDescription: input.shortDescription === undefined ? undefined : input.shortDescription,
      status: input.status ?? undefined,
      basePrice: input.basePrice ?? undefined,
      category: input.categoryId ? { connect: { id: input.categoryId } } : undefined,
      hasVariants: input.hasVariants ?? undefined,
      isFeatured: input.isFeatured ?? undefined,
      tags: input.tags ?? undefined,
      seoTitle: input.seoTitle === undefined ? undefined : input.seoTitle,
      seoDescription: input.seoDescription === undefined ? undefined : input.seoDescription,
    });

    if (input.variants !== undefined) {
      await productsRepository.setVariants(
        id,
        input.variants.map((v) => ({
          sku: v.sku,
          size: v.size ?? null,
          color: v.color ?? null,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          stockQuantity: v.stockQuantity,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
          weight: v.weight ?? null,
          position: v.position,
        })),
      );
    }
    if (input.images !== undefined) {
      await productsRepository.setImages(
        id,
        input.images.map((i) => ({
          url: i.url,
          publicId: i.publicId ?? null,
          alt: i.alt,
          position: i.position,
          width: i.width ?? null,
          height: i.height ?? null,
        })),
      );
    }
    if (input.collectionIds !== undefined) {
      await productsRepository.setCollections(id, input.collectionIds);
    }

    return this.getById(id);
  },

  async remove(id: string) {
    await this.getById(id);
    return productsRepository.remove(id);
  },
};
