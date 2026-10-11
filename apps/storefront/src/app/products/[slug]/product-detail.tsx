'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import { Badge, Button, useT, useToast } from '@anzara/ui';
import type { Product } from '@anzara/shared-types';
import { formatBDT, pickLocalized } from '@anzara/ui';
import { cart } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isAdding, setIsAdding] = useState(false);

  const initialVariant = product.variants[0];
  const [variantId, setVariantId] = useState<string | undefined>(initialVariant?.id);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId),
    [variantId, product.variants],
  );

  // Group variants by size so we can render a size picker.
  const sizesBySize = useMemo(() => {
    const map = new Map<string, typeof product.variants>();
    for (const v of product.variants) {
      const key = v.size ?? 'one-size';
      const arr = map.get(key) ?? [];
      arr.push(v);
      map.set(key, arr);
    }
    return map;
  }, [product]);

  async function handleAddToCart() {
    if (!variant) {
      showError('Please select a variant');
      return;
    }
    if (variant.stockQuantity < quantity) {
      showError('Not enough stock');
      return;
    }
    if (!accessToken) {
      // Not signed in - prompt to log in, then return here.
      router.push(`/login?return=/products/${product.slug}`);
      return;
    }
    setIsAdding(true);
    try {
      await cart.addItem({ variantId: variant.id, quantity }, accessToken);
      success(`Added ${quantity} × ${pickLocalized(product.name, locale)} to cart`);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not add to cart');
    } finally {
      setIsAdding(false);
    }
  }

  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);
  const shortDescription = product.shortDescription
    ? pickLocalized(product.shortDescription, locale)
    : undefined;
  const currentImage = product.images[activeImage] ?? product.images[0];
  const inStock = (variant?.stockQuantity ?? 0) > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 text-sm text-gray-500 hover:text-gray-900"
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.alt}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={
                    i === activeImage
                      ? 'aspect-square overflow-hidden rounded border-2 border-brand-primary'
                      : 'aspect-square overflow-hidden rounded border border-gray-200 opacity-70 hover:opacity-100'
                  }
                >
                  <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          {shortDescription && <p className="mt-2 text-sm text-gray-600">{shortDescription}</p>}

          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-brand-primary">
              {formatBDT(variant?.price.amount ?? product.basePrice.amount, locale)}
            </p>
            {variant?.compareAtPrice && variant.compareAtPrice.amount > variant.price.amount ? (
              <p className="text-sm text-gray-400 line-through">
                {formatBDT(variant.compareAtPrice.amount, locale)}
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {inStock ? (
              <Badge variant="success">In stock</Badge>
            ) : (
              <Badge variant="danger">Out of stock</Badge>
            )}
            {product.isFeatured && <Badge variant="info">Featured</Badge>}
            {product.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>

          {product.hasVariants && sizesBySize.size > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(sizesBySize.entries()).map(([sizeKey, variants]) => {
                  const first = variants[0];
                  if (!first) return null;
                  const active = variants.some((v) => v.id === variantId);
                  return (
                    <button
                      key={sizeKey}
                      type="button"
                      onClick={() => setVariantId(first.id)}
                      className={
                        active
                          ? 'rounded-md border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs text-white'
                          : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-gray-400'
                      }
                    >
                      {sizeKey}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <label className="text-sm text-gray-700">Qty</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, variant?.stockQuantity ?? 1)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="h-10 w-20 rounded-md border border-gray-300 px-2 text-sm"
            />
            <Button size="lg" disabled={!inStock} isLoading={isAdding} onClick={handleAddToCart}>
              {inStock ? 'Add to cart' : 'Out of stock'}
            </Button>
          </div>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{description}</p>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>SKU: {variant?.sku ?? '—'}</p>
            <p>Category: {product.categoryId}</p>
            <p>Free shipping in Bangladesh · Cash on delivery available</p>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t pt-6 text-sm text-gray-500">
        <Link href="/products" className="text-brand-primary hover:underline">
          ← Continue shopping
        </Link>
      </div>
    </div>
  );
}
