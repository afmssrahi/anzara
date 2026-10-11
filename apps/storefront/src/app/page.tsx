import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            Anzara
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link href="/products" className="text-sm font-medium hover:opacity-70">
              Shop
            </Link>
            <Link href="/categories" className="text-sm font-medium hover:opacity-70">
              Categories
            </Link>
            <Link href="/about" className="text-sm font-medium hover:opacity-70">
              About
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
          <h1
            className="text-4xl font-bold tracking-tight sm:text-6xl"
            style={{ color: 'var(--brand-primary)' }}
          >
            Timeless Elegance
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Premium modest fashion, crafted for the modern woman.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/products"
              className="rounded-md px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-primary)' }}
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

      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-gray-500">
          &copy; 2026 Anzara. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
