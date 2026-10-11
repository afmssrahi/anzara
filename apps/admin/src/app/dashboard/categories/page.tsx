'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminShell } from '../../../lib/guard';
import { useAdminAuthStore } from '../../../lib/auth-store';
import { products } from '../../../lib/api';
import { Badge, Button, Input, useToast } from '@anzara/ui';
import type { Category } from '@anzara/shared-types';

export default function AdminCategoriesPage() {
  const token = useAdminAuthStore((s) => s.accessToken);
  const { success, error: showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [slug, setSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    products.adminCategories
      .list(token)
      .then(setCategories)
      .catch(() => undefined);
  }, [token]);

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!nameEn || !slug) {
      showError('Name (EN) and slug are required');
      return;
    }
    setIsSaving(true);
    try {
      const created = await products.adminCategories.create(
        { slug, name: { en: nameEn, bn: nameBn || nameEn } },
        token,
      );
      setCategories((prev) => [...prev, created]);
      setNameEn('');
      setNameBn('');
      setSlug('');
      success('Category created');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this category?')) return;
    try {
      await products.adminCategories.remove(id, token);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      success('Category deleted');
    } catch (err) {
      showError((err as Error).message);
    }
  }

  if (!token) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Sign in to manage categories.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <p className="mt-1 text-sm text-gray-600">{categories.length} total</p>
        </div>

        <form onSubmit={handleCreate} className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Add category</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name (EN) *</label>
              <Input
                value={nameEn}
                onChange={(e) => {
                  setNameEn(e.target.value);
                  if (!slug) setSlug(autoSlug(e.target.value));
                }}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name (BN)</label>
              <Input value={nameBn} onChange={(e) => setNameBn(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slug *</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(autoSlug(e.target.value))}
                className="mt-1"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={isSaving} isLoading={isSaving}>
              + Create category
            </Button>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                    No categories yet.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{c.name.en}</p>
                      <p className="text-xs text-gray-500">{c.name.bn}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">/{c.slug}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.isActive ? 'success' : 'outline'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
