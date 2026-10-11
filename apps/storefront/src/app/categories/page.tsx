import Link from 'next/link';
import { products } from '../../lib/api';
import type { Category } from '@anzara/shared-types';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  let categories: Category[] = [];
  try {
    categories = await products.listCategories();
  } catch {
    // empty
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Categories</h1>
      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">No categories yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                className="block overflow-hidden rounded-lg border bg-white p-4 transition hover:shadow-md"
              >
                <p className="text-sm font-medium text-gray-900">{c.name.en}</p>
                {c.name.bn && <p className="mt-1 text-xs text-gray-500">{c.name.bn}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
