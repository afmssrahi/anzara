'use client';

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../../lib/guard';
import { useAdminAuthStore } from '../../../../lib/auth-store';
import { products } from '../../../../lib/api';
import { Button, Input, Select, Textarea, useToast } from '@anzara/ui';
import type { Category, Product } from '@anzara/shared-types';

interface ProductFormProps {
  productId?: string;
  initialProduct?: Product;
}

type Localized = { en: string; bn: string };

interface VariantDraft {
  sku: string;
  size: string;
  color: string;
  price: number;
  compareAtPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface ImageDraft {
  url: string;
  publicId?: string;
  alt: string;
}

function emptyVariant(): VariantDraft {
  return {
    sku: '',
    size: '',
    color: '',
    price: 0,
    compareAtPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 5,
    isActive: true,
  };
}

function variantsFromProduct(p: Product): VariantDraft[] {
  if (p.variants.length === 0) return [emptyVariant()];
  return p.variants.map((v) => ({
    sku: v.sku,
    size: v.size ?? '',
    color: v.color ?? '',
    price: v.price.amount,
    compareAtPrice: v.compareAtPrice?.amount ?? 0,
    stockQuantity: v.stockQuantity,
    lowStockThreshold: v.lowStockThreshold,
    isActive: v.isActive,
  }));
}

function imagesFromProduct(p: Product): ImageDraft[] {
  return p.images.map((i) => ({ url: i.url, alt: i.alt }));
}

export function ProductForm({ productId, initialProduct }: ProductFormProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const token = useAdminAuthStore((s) => s.accessToken);

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState<Localized>({ en: '', bn: '' });
  const [description, setDescription] = useState<Localized>({ en: '', bn: '' });
  const [slug, setSlug] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [isFeatured, setIsFeatured] = useState(false);
  const [hasVariants, setHasVariants] = useState(true);
  const [tags, setTags] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setDescription(initialProduct.description);
      setSlug(initialProduct.slug);
      setBasePrice(initialProduct.basePrice.amount);
      setCategoryId(initialProduct.categoryId);
      setStatus(initialProduct.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED');
      setIsFeatured(initialProduct.isFeatured);
      setHasVariants(initialProduct.hasVariants);
      setTags(initialProduct.tags.join(', '));
      setVariants(variantsFromProduct(initialProduct));
      setImages(imagesFromProduct(initialProduct));
    }
  }, [initialProduct]);

  useEffect(() => {
    if (!token) return;
    products.adminCategories
      .list(token)
      .then(setCategories)
      .catch(() => undefined);
  }, [token]);

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function onNameEnChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setName((prev) => ({ ...prev, en: next }));
    if (!productId && (!slug || slug === autoSlug(name.en))) {
      setSlug(autoSlug(next));
    }
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!token || !file) return;
    setUploading(true);
    try {
      const result = await products.uploadImage(
        file,
        token,
        productId ? `products/${productId}` : 'products',
      );
      setImages((prev) => [
        ...prev,
        { url: result.url, publicId: result.publicId, alt: name.en || file.name },
      ]);
      success('Image uploaded');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function updateVariant(idx: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!slug || !categoryId || name.en.length === 0) {
      showError('Please fill slug, name (EN), and category');
      return;
    }
    setSubmitting(true);
    const body = {
      slug,
      name,
      description,
      status,
      basePrice,
      categoryId,
      hasVariants,
      isFeatured,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      collectionIds: [],
      variants: variants
        .filter((v) => v.sku)
        .map((v) => ({
          sku: v.sku,
          size: v.size || null,
          color: v.color || null,
          price: v.price,
          compareAtPrice: v.compareAtPrice > 0 ? v.compareAtPrice : null,
          stockQuantity: v.stockQuantity,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
          weight: null,
          position: 0,
        })),
      images: images.map((i) => ({
        url: i.url,
        publicId: i.publicId ?? null,
        alt: i.alt,
        position: 0,
        width: null,
        height: null,
      })),
    };
    try {
      const saved = productId
        ? await products.admin.update(productId, body, token)
        : await products.admin.create(body, token);
      success(`Product ${productId ? 'updated' : 'created'}`);
      router.push(`/dashboard/products/${saved.id}`);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {productId ? 'Edit product' : 'New product'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">Fields marked with * are required.</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/products')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} isLoading={submitting}>
              {productId ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </div>

        <section className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Basics</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name (EN) *</label>
              <Input value={name.en} onChange={onNameEnChange} className="mt-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name (BN)</label>
              <Input
                value={name.bn}
                onChange={(e) => setName((p) => ({ ...p, bn: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slug *</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(autoSlug(e.target.value))}
                className="mt-1"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category *</label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1"
                required
              >
                <option value="">— Select —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.en} ({c.name.bn})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Base price (paisa) *
              </label>
              <Input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="mt-1"
                required
                min={0}
              />
              <p className="mt-1 text-xs text-gray-500">Paisa. e.g. 2500.00 BDT = 250000 paisa.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')}
                className="mt-1"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description (EN) *</label>
              <Textarea
                value={description.en}
                onChange={(e) => setDescription((p) => ({ ...p, en: e.target.value }))}
                rows={4}
                className="mt-1"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description (BN)</label>
              <Textarea
                value={description.bn}
                onChange={(e) => setDescription((p) => ({ ...p, bn: e.target.value }))}
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Tags (comma separated)
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1"
                placeholder="e.g. summer, linen, dress"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Featured (show on home page)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Has variants (size / color)
            </label>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Variants</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
            >
              + Add variant
            </Button>
          </div>
          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 gap-3 rounded border border-gray-200 p-3 md:grid-cols-7"
              >
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500">SKU</label>
                  <Input
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                    className="mt-1"
                    placeholder="ANZ-001-S"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Size</label>
                  <Input
                    value={v.size}
                    onChange={(e) => updateVariant(idx, { size: e.target.value })}
                    className="mt-1"
                    placeholder="S / M / L"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Color</label>
                  <Input
                    value={v.color}
                    onChange={(e) => updateVariant(idx, { color: e.target.value })}
                    className="mt-1"
                    placeholder="Beige"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Price (paisa)</label>
                  <Input
                    type="number"
                    value={v.price}
                    onChange={(e) => updateVariant(idx, { price: Number(e.target.value) })}
                    className="mt-1"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Stock</label>
                  <Input
                    type="number"
                    value={v.stockQuantity}
                    onChange={(e) => updateVariant(idx, { stockQuantity: Number(e.target.value) })}
                    className="mt-1"
                    min={0}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={variants.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Images</h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                {uploading ? 'Uploading…' : '+ Upload image'}
              </label>
            </div>
          </div>
          {images.length === 0 ? (
            <p className="text-sm text-gray-500">No images yet. Upload your first image.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
              {images.map((img, idx) => (
                <div key={img.url + idx} className="relative">
                  <div className="aspect-square overflow-hidden rounded border bg-gray-100">
                    <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded bg-white/90 px-2 py-0.5 text-xs text-red-600 shadow"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/products')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} isLoading={submitting}>
            {productId ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
