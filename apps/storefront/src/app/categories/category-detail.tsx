'use client';

import Link from 'next/link';
import { useT } from '@anzara/ui';
import type { Category, Product } from '@anzara/shared-types';
import { formatBDT, pickLocalized } from '@anzara/ui';

export function CategoryView({ category, products }: { category: Category; products: Product[] }) {
  const { locale } = useT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{pickLocalized(category.name, locale)}</h1>
      {category.description && (
        <p className="mt-2 text-sm text-gray-600">{pickLocalized(category.description, locale)}</p>
      )}

      {category.children && category.children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/categories/${child.slug}`}
              className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:border-gray-400"
            >
              {pickLocalized(child.name, locale)}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">No products in this category yet.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
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
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-medium text-gray-900">
                    {pickLocalized(p.name, locale)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-primary">
                    {formatBDT(p.basePrice.amount, locale)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
