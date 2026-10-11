'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import type { Banner } from '@anzara/shared-types';
import { Button, FormField, Input, Textarea, useToast } from '@anzara/ui';
import { content } from '../../../../lib/api';
import { useAdminAuthStore } from '../../../../lib/auth-store';

interface Form {
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const EMPTY: Form = {
  title: '',
  subtitle: '',
  imageUrl: '',
  mobileImageUrl: '',
  linkUrl: '',
  position: '0',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

function fromDto(b: Banner): Form {
  return {
    title: b.title,
    subtitle: b.subtitle ?? '',
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl ?? '',
    linkUrl: b.linkUrl ?? '',
    position: String(b.position),
    isActive: b.isActive,
    startsAt: b.startsAt ? b.startsAt.slice(0, 16) : '',
    endsAt: b.endsAt ? b.endsAt.slice(0, 16) : '',
  };
}

export default function AdminBannerForm() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const isEdit = Boolean(params.id);
  const { success, error: showError } = useToast();
  const accessToken = useAdminAuthStore((s) => s.accessToken);

  const [form, setForm] = useState<Form>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !accessToken) return;
    setIsLoading(true);
    content
      .listBanners(accessToken, { page: 1, limit: 100 })
      .then((res) => {
        const found = res.data.find((b) => b.id === params.id);
        if (found) setForm(fromDto(found));
      })
      .catch((err) => {
        if (err instanceof ApiError) showError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, isEdit, params.id, showError]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    if (!form.imageUrl) {
      showError('Image URL is required');
      return;
    }
    const body: Parameters<typeof content.createBanner>[0] = {
      title: form.title.trim(),
      ...(form.subtitle.trim() ? { subtitle: form.subtitle.trim() } : {}),
      imageUrl: form.imageUrl.trim(),
      ...(form.mobileImageUrl.trim() ? { mobileImageUrl: form.mobileImageUrl.trim() } : {}),
      ...(form.linkUrl.trim() ? { linkUrl: form.linkUrl.trim() } : {}),
      position: Number(form.position || 0),
      isActive: form.isActive,
      ...(form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}),
      ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
    };
    setIsSaving(true);
    try {
      if (isEdit) {
        await content.updateBanner(params.id as string, body, accessToken);
        success('Banner updated');
      } else {
        await content.createBanner(body, accessToken);
        success('Banner created');
      }
      router.push('/dashboard/content/banners');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not save banner');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/content/banners"
          className="text-sm text-brand-primary hover:underline"
        >
          ← Back to banners
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{isEdit ? 'Edit banner' : 'New banner'}</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-white p-6">
        <FormField label="Title">
          <Input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
            maxLength={200}
          />
        </FormField>
        <FormField label="Subtitle" hint="optional">
          <Textarea
            value={form.subtitle}
            onChange={(e) => set('subtitle', e.target.value)}
            rows={2}
            maxLength={500}
          />
        </FormField>
        <FormField label="Image URL" hint="Recommended 1200×600 (2:1)">
          <Input
            type="url"
            value={form.imageUrl}
            onChange={(e) => set('imageUrl', e.target.value)}
            placeholder="https://..."
            required
          />
        </FormField>
        <FormField label="Mobile image URL" hint="optional, falls back to the main image">
          <Input
            type="url"
            value={form.mobileImageUrl}
            onChange={(e) => set('mobileImageUrl', e.target.value)}
            placeholder="https://..."
          />
        </FormField>
        <FormField label="Link URL" hint="optional — where clicking the banner goes">
          <Input
            type="url"
            value={form.linkUrl}
            onChange={(e) => set('linkUrl', e.target.value)}
            placeholder="https://..."
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Position" hint="Lower = first">
            <Input
              type="number"
              value={form.position}
              onChange={(e) => set('position', e.target.value)}
            />
          </FormField>
          <div className="flex items-end gap-2 pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Starts at" hint="optional">
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
            />
          </FormField>
          <FormField label="Ends at" hint="optional">
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => set('endsAt', e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4">
          <Link href="/dashboard/content/banners">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isSaving}>
            {isEdit ? 'Save changes' : 'Create banner'}
          </Button>
        </div>
      </form>
    </div>
  );
}
