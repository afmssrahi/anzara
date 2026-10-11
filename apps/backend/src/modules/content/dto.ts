/**
 * Content module DTO helpers.
 */
import type { Banner as PrismaBanner, Page as PrismaPage } from '@prisma/client';
import type { Banner, Page } from '@anzara/shared-types';

export function toBannerDto(b: PrismaBanner): Banner {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    linkUrl: b.linkUrl,
    position: b.position,
    isActive: b.isActive,
    startsAt: b.startsAt ? b.startsAt.toISOString() : null,
    endsAt: b.endsAt ? b.endsAt.toISOString() : null,
  };
}

function coerceLocalized(v: unknown): { en: string; bn: string } {
  if (typeof v === 'string') return { en: v, bn: '' };
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    return {
      en: typeof obj['en'] === 'string' ? (obj['en'] as string) : '',
      bn: typeof obj['bn'] === 'string' ? (obj['bn'] as string) : '',
    };
  }
  return { en: '', bn: '' };
}

export function toPageDto(p: PrismaPage): Page {
  return {
    id: p.id,
    slug: p.slug,
    title: coerceLocalized(p.title),
    content: coerceLocalized(p.content),
    isPublished: p.isPublished,
    updatedAt: p.updatedAt.toISOString(),
  };
}
