/**
 * Categories module - business logic.
 */
import { ConflictError, NotFoundError } from '../../lib/errors';
import { categoriesRepository } from './repository';
import type { CreateCategoryInput, UpdateCategoryInput } from './validators';

export const categoriesService = {
  async listActive() {
    return categoriesRepository.list({ onlyActive: true, includeProductCount: true });
  },

  async listAll() {
    return categoriesRepository.list({ includeProductCount: true });
  },

  async getById(id: string) {
    const category = await categoriesRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  },

  async getBySlug(slug: string) {
    const category = await categoriesRepository.findBySlug(slug);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  },

  async create(input: CreateCategoryInput) {
    const existing = await categoriesRepository.findBySlug(input.slug);
    if (existing) throw new ConflictError(`Category slug already exists: ${input.slug}`);
    return categoriesRepository.create({
      slug: input.slug,
      name: input.name,
      description: input.description ?? undefined,
      image: input.image ?? null,
      parent: input.parentId ? { connect: { id: input.parentId } } : undefined,
      position: input.position,
      isActive: input.isActive,
    });
  },

  async update(id: string, input: UpdateCategoryInput) {
    await this.getById(id);
    if (input.slug) {
      const existing = await categoriesRepository.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Category slug already exists: ${input.slug}`);
      }
    }
    return categoriesRepository.update(id, {
      slug: input.slug ?? undefined,
      name: input.name ?? undefined,
      description: input.description ?? undefined,
      image: input.image === undefined ? undefined : input.image,
      parent:
        input.parentId === undefined
          ? undefined
          : input.parentId
            ? { connect: { id: input.parentId } }
            : { disconnect: true },
      position: input.position ?? undefined,
      isActive: input.isActive ?? undefined,
    });
  },

  async remove(id: string) {
    await this.getById(id);
    return categoriesRepository.remove(id);
  },
};
