import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  breadcrumbLd,
  jsonLdScript,
  productLd,
  pickLocalized,
  type JsonLdObject,
} from '@anzara/ui';
import { products, reviews } from '../../../lib/api';
import { ProductDetail } from './product-detail';

const APP_URL = process.env['APP_URL'] || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const product = await products.getBySlug(params.slug);
    const name = pickLocalized(product.name, 'en');
    const description = pickLocalized(product.shortDescription ?? product.description, 'en');
    const images = product.images.map((i) => i.url).filter((u): u is string => Boolean(u));
    const canonical = `${APP_URL}/products/${product.slug}`;
    return {
      title: name,
      description: description || undefined,
      alternates: { canonical },
      openGraph: {
        type: 'website',
        url: canonical,
        title: name,
        description: description || undefined,
        images: images.length > 0 ? [{ url: images[0]! }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: name,
        description: description || undefined,
        images: images.length > 0 ? [images[0]!] : undefined,
      },
    };
  } catch {
    return { title: 'Product not found' };
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product;
  try {
    product = await products.getBySlug(params.slug);
  } catch {
    notFound();
  }
  if (!product) notFound();

  // Average rating for JSON-LD
  let rating: { value: number; count: number } | undefined;
  try {
    const summary = await reviews.summary(product.id);
    if (summary.count > 0) rating = { value: summary.average, count: summary.count };
  } catch {
    /* non-fatal */
  }

  const canonical = `${APP_URL}/products/${product.slug}`;
  const productJsonLd = productLd({
    product,
    url: canonical,
    siteUrl: APP_URL,
    ...(rating ? { rating } : {}),
  });
  const breadcrumbJsonLd = breadcrumbLd([
    { name: 'Home', url: `${APP_URL}/` },
    { name: 'Products', url: `${APP_URL}/products` },
    { name: pickLocalized(product.name, 'en'), url: canonical },
  ]);

  const jsonLd: JsonLdObject[] = [productJsonLd, breadcrumbJsonLd];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <ProductDetail product={product} />
    </>
  );
}
