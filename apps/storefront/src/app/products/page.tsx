import { Suspense } from 'react';
import { products } from '../../lib/api';
import { ProductsView } from './products-view';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  let initialProducts: Awaited<ReturnType<typeof products.list>>['data'] = [];
  let initialCategories: Awaited<ReturnType<typeof products.listCategories>> = [];
  try {
    const [list, categories] = await Promise.all([
      products.list({ limit: 20 }),
      products.listCategories(),
    ]);
    initialProducts = list.data;
    initialCategories = categories;
  } catch {
    // Render empty state if backend is down
  }
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading…</div>}>
      <ProductsView
        initialProducts={initialProducts}
        initialTotal={initialProducts.length}
        initialCategories={initialCategories}
      />
    </Suspense>
  );
}
