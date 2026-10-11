'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '@anzara/api-client';
import type { SiteSetting } from '@anzara/api-client';
import { Button, Input, useToast } from '@anzara/ui';
import { AdminShell } from '../../../lib/guard';
import { useAdminAuthStore } from '../../../lib/auth-store';
import { settings } from '../../../lib/api';

/**
 * Group definitions - which keys belong to which group, and what input
 * shape they expect. Keeps the page simple and avoids exposing every
 * key as raw JSON.
 */
const GROUPS: {
  id: string;
  label: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'color' | 'email' | 'tel' | 'url' | 'textarea';
    placeholder?: string;
  }>;
}[] = [
  {
    id: 'theme',
    label: 'Theme',
    description: 'Brand colors and visual identity. Read by the storefront at runtime.',
    fields: [
      { key: 'brand.primaryColor', label: 'Primary color', type: 'color' },
      { key: 'brand.accentColor', label: 'Accent color', type: 'color' },
    ],
  },
  {
    id: 'general',
    label: 'Brand & contact',
    description: 'Name, tagline, and contact details shown across the site.',
    fields: [
      { key: 'brand.name', label: 'Brand name', type: 'text' },
      { key: 'brand.tagline', label: 'Tagline', type: 'text' },
      { key: 'contact.email', label: 'Contact email', type: 'email' },
      { key: 'contact.phone', label: 'Contact phone', type: 'tel' },
      { key: 'contact.address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    description: 'Public profile URLs.',
    fields: [
      {
        key: 'social.facebook',
        label: 'Facebook URL',
        type: 'url',
        placeholder: 'https://facebook.com/your-page',
      },
      {
        key: 'social.instagram',
        label: 'Instagram URL',
        type: 'url',
        placeholder: 'https://instagram.com/your-handle',
      },
      {
        key: 'social.whatsapp',
        label: 'WhatsApp number',
        type: 'tel',
        placeholder: '+8801700000000',
      },
    ],
  },
  {
    id: 'seo',
    label: 'SEO defaults',
    description: 'Default title and description used by the storefront.',
    fields: [
      { key: 'seo.defaultTitle', label: 'Default title', type: 'text' },
      { key: 'seo.defaultDescription', label: 'Default description', type: 'textarea' },
    ],
  },
];

export default function AdminSettingsPage() {
  const { success, error: showError } = useToast();
  const token = useAdminAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<SiteSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    settings
      .list({}, token)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError) showError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, showError]);

  const valuesByKey = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const it of items) map.set(it.key, it.value);
    return map;
  }, [items]);

  if (!token) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Sign in to manage settings.</p>
      </AdminShell>
    );
  }
  if (isLoading) {
    return (
      <AdminShell>
        <p className="text-sm text-gray-500">Loading…</p>
      </AdminShell>
    );
  }

  async function save(key: string, value: unknown, group: string) {
    if (!token) return;
    setSaving(key);
    try {
      const fresh = await settings.upsert({ key, value, group, isPublic: true }, token);
      setItems((prev) => {
        const next = prev.filter((p) => p.key !== fresh.key);
        return [...next, fresh].sort((a, b) =>
          a.group === b.group ? a.key.localeCompare(b.key) : a.group.localeCompare(b.group),
        );
      });
      success(`Saved ${key}`);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError(`Failed to save ${key}`);
    } finally {
      setSaving(null);
    }
  }

  function readValue(key: string): string {
    const v = valuesByKey.get(key);
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return JSON.stringify(v);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="mt-1 text-sm text-gray-600">
            Brand identity, contact, and SEO. Changes apply to the storefront immediately.
          </p>
        </div>

        {GROUPS.map((group) => (
          <section key={group.id} className="rounded-lg border bg-white p-6">
            <header className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">{group.label}</h3>
              <p className="mt-0.5 text-sm text-gray-500">{group.description}</p>
            </header>
            <div className="space-y-4">
              {group.fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  initialValue={readValue(field.key)}
                  isSaving={saving === field.key}
                  onSubmit={(v) => save(field.key, v, group.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}

function Field({
  field,
  initialValue,
  isSaving,
  onSubmit,
}: {
  field: {
    key: string;
    label: string;
    type: 'text' | 'color' | 'email' | 'tel' | 'url' | 'textarea';
    placeholder?: string;
  };
  initialValue: string;
  isSaving: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(value);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]"
    >
      <label className="block">
        <span className="block text-sm font-medium text-gray-700">{field.label}</span>
        {field.type === 'color' ? (
          <span className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border border-gray-300"
            />
            <Input value={value} onChange={(e) => setValue(e.target.value)} className="font-mono" />
          </span>
        ) : field.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder={field.placeholder}
          />
        ) : (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1"
            placeholder={field.placeholder}
          />
        )}
        <span className="mt-1 block text-xs text-gray-400">{field.key}</span>
      </label>
      <Button type="submit" size="sm" isLoading={isSaving}>
        Save
      </Button>
    </form>
  );
}
