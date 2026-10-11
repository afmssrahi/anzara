'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '../../../../lib/guard';
import { useAdminAuthStore } from '../../../../lib/auth-store';
import { products } from '../../../../lib/api';
import type { Product } from '@anzara/shared-types';
import { ProductForm } from '../new/product-form';
import { Spinner } from '@anzara/ui';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAdminAuthStore((s) => s.accessToken);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !params.id) return;
    setIsLoading(true);
    products.admin
      .get(params.id, token)
      .then(setProduct)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token, params.id]);

  if (!token) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Sign in to edit products.</p>
      </AdminShell>
    );
  }
  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" /> Loading product…
        </div>
      </AdminShell>
    );
  }
  if (error || !product) {
    return (
      <AdminShell>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Product not found.'}
          <button
            type="button"
            onClick={() => router.push('/dashboard/products')}
            className="ml-4 text-brand-primary hover:underline"
          >
            ← Back to products
          </button>
        </div>
      </AdminShell>
    );
  }
  return <ProductForm productId={product.id} initialProduct={product} />;
}
