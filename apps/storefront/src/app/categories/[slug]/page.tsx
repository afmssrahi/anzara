import { notFound } from 'next/navigation';
import { products } from '../../../lib/api';
import { CategoryView } from '../category-detail';

export const dynamic = 'force-dynamic';

export default async function CategorySlugPage({ params }: { params: { slug: string } }) {
  let category;
  try {
    category = await products.getCategoryBySlug(params.slug);
  } catch {
    notFound();
  }
  const list = await products.list({ categoryId: category.id, limit: 50 }).catch(() => ({
    data: [],
    meta: { page: 1, limit: 0, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
  }));
  return <CategoryView category={category} products={list.data} />;
}
