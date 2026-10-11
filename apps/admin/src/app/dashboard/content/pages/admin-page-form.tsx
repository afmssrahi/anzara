'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import type { Page } from '@anzara/shared-types';
import { Button, FormField, Input, Textarea, useToast } from '@anzara/ui';
import { content } from '../../../../lib/api';
import { useAdminAuthStore } from '../../../../lib/auth-store';

interface Form {
  slug: string;
  titleEn: string;
  titleBn: string;
  contentEn: string;
  contentBn: string;
  isPublished: boolean;
}

const EMPTY: Form = {
  slug: '',
  titleEn: '',
  titleBn: '',
  contentEn: '',
  contentBn: '',
  isPublished: false,
};

function fromDto(p: Page): Form {
  return {
    slug: p.slug,
    titleEn: p.title.en,
    titleBn: p.title.bn,
    contentEn: p.content.en,
    contentBn: p.content.bn,
    isPublished: p.isPublished,
  };
}

export default function AdminPageForm() {
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
      .getPage(params.id as string, accessToken)
      .then((p) => setForm(fromDto(p)))
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
    if (!form.slug.trim() || !form.titleEn.trim() || !form.contentEn.trim()) {
      showError('Slug, English title, and English content are required');
      return;
    }
    const body: Parameters<typeof content.createPage>[0] = {
      slug: form.slug.trim(),
      title: form.titleBn.trim()
        ? { en: form.titleEn.trim(), bn: form.titleBn.trim() }
        : form.titleEn.trim(),
      content: form.contentBn.trim() ? { en: form.contentEn, bn: form.contentBn } : form.contentEn,
      isPublished: form.isPublished,
    };
    setIsSaving(true);
    try {
      if (isEdit) {
        await content.updatePage(params.id as string, body, accessToken);
        success('Page updated');
      } else {
        await content.createPage(body, accessToken);
        success('Page created');
      }
      router.push('/dashboard/content/pages');
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not save page');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/content/pages"
          className="text-sm text-brand-primary hover:underline"
        >
          ← Back to pages
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{isEdit ? `Edit /${form.slug}` : 'New page'}</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-white p-6">
        <FormField label="Slug" hint="lowercase, e.g. about-us, terms, privacy">
          <Input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase())}
            required
            maxLength={120}
            pattern="[a-z0-9\-]+"
            disabled={isEdit}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Title (EN)">
            <Input value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} required />
          </FormField>
          <FormField label="Title (BN)" hint="optional">
            <Input value={form.titleBn} onChange={(e) => set('titleBn', e.target.value)} />
          </FormField>
        </div>

        <FormField label="Content (EN)">
          <Textarea
            value={form.contentEn}
            onChange={(e) => set('contentEn', e.target.value)}
            rows={10}
            required
            placeholder="Plain text or simple HTML"
          />
        </FormField>
        <FormField label="Content (BN)" hint="optional">
          <Textarea
            value={form.contentBn}
            onChange={(e) => set('contentBn', e.target.value)}
            rows={10}
          />
        </FormField>

        <label className="flex items-center gap-2 pt-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => set('isPublished', e.target.checked)}
            className="h-4 w-4"
          />
          Published (visible on the storefront)
        </label>

        <div className="flex items-center justify-end gap-2 pt-4">
          <Link href="/dashboard/content/pages">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isSaving}>
            {isEdit ? 'Save changes' : 'Create page'}
          </Button>
        </div>
      </form>
    </div>
  );
}
