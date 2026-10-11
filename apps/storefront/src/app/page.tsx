import Link from 'next/link';
import { products, content } from '../lib/api';
import type { Banner, Category, Product } from '@anzara/shared-types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let featured: Product[] = [];
  let categories: Category[] = [];
  let banners: Banner[] = [];
  try {
    const [f, c, b] = await Promise.all([
      products.featured(),
      products.listCategories(),
      content.activeBanners().catch(() => [] as Banner[]),
    ]);
    featured = f.slice(0, 4);
    categories = c;
    banners = b;
  } catch {
    // Backend might be down; render shell only.
  }

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Anzara
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link href="/products" className="text-sm font-medium hover:opacity-70">
              Shop
            </Link>
            <Link href="/categories" className="text-sm font-medium hover:opacity-70">
              Categories
            </Link>
          </nav>
          <div className="flex gap-4">
            <Link href="/cart" className="text-sm font-medium">
              Cart
            </Link>
            <Link href="/account" className="text-sm font-medium">
              Account
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-primary sm:text-6xl">
            Timeless Elegance
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Premium modest fashion, crafted for the modern woman.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/products"
              className="rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Shop Now
            </Link>
            <Link
              href="/categories"
              className="rounded-md border px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      {banners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {banners.map((b) => {
              const inner = (
                <div className="relative h-48 overflow-hidden rounded-lg bg-gray-100 md:h-56">
                  <img
                    src={b.mobileImageUrl || b.imageUrl}
                    alt={b.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
                    <p className="text-lg font-semibold">{b.title}</p>
                    {b.subtitle ? <p className="text-sm opacity-90">{b.subtitle}</p> : null}
                  </div>
                </div>
              );
              return (
                <li key={b.id}>
                  {b.linkUrl ? (
                    <Link href={b.linkUrl} className="block transition hover:opacity-95">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <h2 className="mb-4 text-xl font-semibold">Shop by category</h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="block rounded-lg border bg-white p-6 text-center transition hover:shadow-md"
                >
                  <p className="font-medium">{c.name.en}</p>
                  {c.name.bn && <p className="mt-1 text-xs text-gray-500">{c.name.bn}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Featured</h2>
            <Link href="/products" className="text-sm text-brand-primary hover:underline">
              View all →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
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
                    <p className="line-clamp-1 text-sm font-medium text-gray-900">{p.name.en}</p>
                    <p className="mt-1 text-sm font-semibold text-brand-primary">
                      ৳{Math.round(p.basePrice.amount / 100)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-gray-500">
          © 2026 Anzara. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
