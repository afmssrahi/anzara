/**
 * Collections module - business logic.
 */
import { ConflictError, NotFoundError } from '../../lib/errors';
import { collectionsRepository } from './repository';
import type { CreateCollectionInput, UpdateCollectionInput } from './validators';

export const collectionsService = {
  async listActive() {
    return collectionsRepository.list({ onlyActive: true });
  },

  async listAll() {
    return collectionsRepository.list();
  },

  async getById(id: string) {
    const collection = await collectionsRepository.findById(id);
    if (!collection) throw new NotFoundError('Collection not found');
    return collection;
  },

  async getBySlug(slug: string) {
    const collection = await collectionsRepository.findBySlug(slug);
    if (!collection) throw new NotFoundError('Collection not found');
    return collection;
  },

  async create(input: CreateCollectionInput) {
    const existing = await collectionsRepository.findBySlug(input.slug);
    if (existing) throw new ConflictError(`Collection slug already exists: ${input.slug}`);
    const { productIds, ...data } = input;
    const collection = await collectionsRepository.create({
      slug: data.slug,
      name: data.name,
      description: data.description ?? undefined,
      image: data.image ?? null,
      position: data.position,
      isActive: data.isActive,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
    });
    if (productIds.length > 0) {
      await collectionsRepository.setProducts(collection.id, productIds);
    }
    return this.getById(collection.id);
  },

  async update(id: string, input: UpdateCollectionInput) {
    await this.getById(id);
    if (input.slug) {
      const existing = await collectionsRepository.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Collection slug already exists: ${input.slug}`);
      }
    }
    const { productIds, ...data } = input;
    const collection = await collectionsRepository.update(id, {
      slug: data.slug ?? undefined,
      name: data.name ?? undefined,
      description: data.description ?? undefined,
      image: data.image === undefined ? undefined : data.image,
      position: data.position ?? undefined,
      isActive: data.isActive ?? undefined,
      startsAt: data.startsAt === undefined ? undefined : data.startsAt,
      endsAt: data.endsAt === undefined ? undefined : data.endsAt,
    });
    if (productIds !== undefined) {
      await collectionsRepository.setProducts(id, productIds);
    }
    return this.getById(collection.id);
  },

  async remove(id: string) {
    await this.getById(id);
    return collectionsRepository.remove(id);
  },
};
