'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Badge, Button, Input, Select, useT } from '@anzara/ui';
import type { Category, Product } from '@anzara/shared-types';
import { products } from '../../lib/api';
import { formatBDT, pickLocalized } from '@anzara/ui';

interface ProductsViewProps {
  initialProducts: Product[];
  initialTotal: number;
  initialCategories: Category[];
}

function readArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').filter(Boolean);
}

export function ProductsView({ initialProducts, initialCategories }: ProductsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useT();

  const initialCategory = searchParams.get('categoryId') ?? '';
  const initialMin = searchParams.get('minPrice') ?? '';
  const initialMax = searchParams.get('maxPrice') ?? '';
  const initialInStock = searchParams.get('inStock') === 'true';
  const initialSearch = searchParams.get('search') ?? '';
  const initialSort = searchParams.get('sort') ?? '-createdAt';
  const initialSizes = readArrayParam(searchParams.get('sizes'));
  const initialColors = readArrayParam(searchParams.get('colors'));

  const [items, setItems] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState(initialMin);
  const [maxPrice, setMaxPrice] = useState(initialMax);
  const [inStock, setInStock] = useState(initialInStock);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [sizes, setSizes] = useState<string[]>(initialSizes);
  const [colors, setColors] = useState<string[]>(initialColors);

  // Reload when filters change.
  useEffect(() => {
    const handle = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string | undefined> = {
          categoryId: categoryId || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          inStock: inStock ? 'true' : undefined,
          search: search || undefined,
          sort,
        };
        if (sizes.length > 0) params['sizes'] = sizes.join(',');
        if (colors.length > 0) params['colors'] = colors.join(',');
        const result = await products.list(params as never);
        setItems(result.data);
        // Reflect state in the URL without scrolling
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v) usp.set(k, v);
        }
        router.replace(`/products${usp.toString() ? `?${usp}` : ''}`, { scroll: false });
      } finally {
        setIsLoading(false);
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [categoryId, minPrice, maxPrice, inStock, search, sort, sizes, colors, router]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) for (const v of p.variants) if (v.size) set.add(v.size);
    return Array.from(set).sort();
  }, [items]);

  const allColors = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) for (const v of p.variants) if (v.color) set.add(v.color);
    return Array.from(set).sort();
  }, [items]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Shop</h1>
        <div className="text-sm text-gray-500">
          {isLoading ? 'Loading…' : `${items.length} product${items.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <Input
              type="search"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search…"
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1"
            >
              <option value="">All</option>
              {initialCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {pickLocalized(c.name, locale)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price (BDT)</label>
            <div className="mt-1 flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {allSizes.length > 0 && (
            <div>
              <p className="block text-sm font-medium text-gray-700">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {allSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(sizes, s, setSizes)}
                    className={
                      sizes.includes(s)
                        ? 'rounded-full border border-brand-primary bg-brand-primary px-3 py-1 text-xs text-white'
                        : 'rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:border-gray-400'
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allColors.length > 0 && (
            <div>
              <p className="block text-sm font-medium text-gray-700">Color</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {allColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(colors, c, setColors)}
                    className={
                      colors.includes(c)
                        ? 'rounded-full border border-brand-primary bg-brand-primary px-3 py-1 text-xs text-white'
                        : 'rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:border-gray-400'
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            In stock only
          </label>

          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => {
              setCategoryId('');
              setMinPrice('');
              setMaxPrice('');
              setInStock(false);
              setSearch('');
              setSizes([]);
              setColors([]);
            }}
          >
            Reset filters
          </Button>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {categoryId
                ? `In ${initialCategories.find((c) => c.id === categoryId)?.name.en ?? ''}`
                : 'All products'}
            </p>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
              <option value="-createdAt">Newest</option>
              <option value="createdAt">Oldest</option>
              <option value="basePrice">Price ↑</option>
              <option value="-basePrice">Price ↓</option>
              <option value="name">Name A→Z</option>
              <option value="-name">Name Z→A</option>
            </Select>
          </div>

          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No products match these filters.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/products/${p.slug}`}
                    className="group block overflow-hidden rounded-lg border bg-white transition hover:shadow-md"
                  >
                    <div className="aspect-[4/5] w-full bg-gray-100">
                      {p.images[0] ? (
                        <img
                          src={p.images[0].url}
                          alt={p.images[0].alt}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-sm font-medium text-gray-900">
                        {pickLocalized(p.name, locale)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm font-semibold text-brand-primary">
                          {formatBDT(p.basePrice.amount, locale)}
                        </p>
                        {(() => {
                          // Show compareAtPrice from the first variant that has one
                          const cmp = p.variants.find(
                            (v) => v.compareAtPrice && v.compareAtPrice.amount > v.price.amount,
                          )?.compareAtPrice;
                          if (!cmp) return null;
                          return (
                            <p className="text-xs text-gray-400 line-through">
                              {formatBDT(cmp.amount, locale)}
                            </p>
                          );
                        })()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.totalStock === 0 ? (
                          <Badge variant="danger">Out of stock</Badge>
                        ) : p.totalStock <= 5 ? (
                          <Badge variant="warning">Low stock</Badge>
                        ) : (
                          <Badge variant="success">In stock</Badge>
                        )}
                        {p.isFeatured && <Badge variant="info">Featured</Badge>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
