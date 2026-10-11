import { notFound } from 'next/navigation';
import { products } from '../../../lib/api';
import { ProductDetail } from './product-detail';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product;
  try {
    product = await products.getBySlug(params.slug);
  } catch {
    notFound();
  }
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
