'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@anzara/api-client';
import type { Review, ReviewSummary } from '@anzara/shared-types';
import { Button, FormField, Textarea, useT, useToast } from '@anzara/ui';
import { reviews } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

interface Props {
  productId: string;
  initialSummary?: ReviewSummary;
  initialReviews?: Review[];
}

export function ReviewsSection({ productId, initialSummary, initialReviews }: Props) {
  const { locale } = useT();
  const { success, error: showError } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<Review[]>(initialReviews ?? []);
  const [summary, setSummary] = useState<ReviewSummary>(
    initialSummary ?? {
      productId,
      count: 0,
      average: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
  );
  const [isLoading, setIsLoading] = useState(!initialReviews);

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialReviews && initialSummary) return;
    let cancelled = false;
    Promise.all([reviews.listForProduct(productId, { limit: 10 }), reviews.summary(productId)])
      .then(([list, sum]) => {
        if (cancelled) return;
        setItems(list.data);
        setSummary(list.summary);
        // touch `sum` to keep TS happy if the API ever returns different shapes
        void sum;
      })
      .catch(() => {
        /* reviews are non-critical; don't toast */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, initialReviews, initialSummary]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) {
      showError('Please log in to leave a review');
      return;
    }
    if (comment.trim().length < 10) {
      showError('Please write at least 10 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await reviews.create(
        {
          productId,
          rating,
          ...(title.trim() ? { title: title.trim() } : {}),
          comment: comment.trim(),
        },
        accessToken,
      );
      success('Thanks! Your review will appear after moderation.');
      // Optimistically show the review, but flagged as un-approved.
      setItems((prev) => [created, ...prev]);
      setShowForm(false);
      setTitle('');
      setComment('');
      setRating(5);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not submit review');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-xl font-bold text-gray-900">Customer reviews</h2>

      {/* Summary */}
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900">
            {summary.count > 0 ? summary.average.toFixed(1) : '—'}
          </p>
          <div className="mt-1 text-sm text-amber-500">
            {renderStars(Math.round(summary.average))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {summary.count} review{summary.count === 1 ? '' : 's'}
          </p>
        </div>
        {summary.count > 0 && (
          <div className="flex-1 space-y-1">
            {([5, 4, 3, 2, 1] as const).map((s) => {
              const n = summary.breakdown[s] ?? 0;
              const pct = summary.count > 0 ? Math.round((n / summary.count) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-6">{s}★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Write a review */}
      <div className="mt-6">
        {accessToken ? (
          !showForm ? (
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              Write a review
            </Button>
          ) : (
            <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-4">
              <FormField label="Your rating">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={
                        s <= rating
                          ? 'text-2xl text-amber-500'
                          : 'text-2xl text-gray-300 hover:text-amber-300'
                      }
                      aria-label={`${s} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Title (optional)">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-brand-primary focus:outline-none"
                  maxLength={120}
                  placeholder="What stood out?"
                />
              </FormField>
              <FormField label="Your review" hint="At least 10 characters">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Tell other customers what you think"
                />
              </FormField>
              <div className="flex items-center gap-2">
                <Button type="submit" isLoading={isSubmitting}>
                  Submit review
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Reviews are moderated before they appear on the site.
              </p>
            </form>
          )
        ) : (
          <p className="text-sm text-gray-500">
            <a
              href={`/login?return=/products/${encodeURIComponent(productId)}`}
              className="text-brand-primary hover:underline"
            >
              Log in
            </a>{' '}
            to write a review.
          </p>
        )}
      </div>

      {/* List */}
      <div className="mt-8 space-y-6">
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading reviews…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">
            No reviews yet. Be the first to share your thoughts.
          </p>
        ) : (
          items.map((r) => (
            <article key={r.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {r.userDisplayName}
                    {r.isVerified ? (
                      <span className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                        Verified buyer
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString(locale)}
                  </p>
                </div>
                <div className="text-amber-500">{renderStars(r.rating)}</div>
              </div>
              {r.title ? <p className="mt-2 text-sm font-medium text-gray-900">{r.title}</p> : null}
              <p className="mt-1 text-sm text-gray-700">{r.comment}</p>
              {r.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer">
                      <img
                        src={src}
                        alt={`Review photo ${i + 1}`}
                        className="h-16 w-16 rounded object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function renderStars(n: number) {
  return (
    <span aria-label={`${n} out of 5 stars`}>
      {'★'.repeat(n)}
      <span className="text-gray-200">{'★'.repeat(5 - n)}</span>
    </span>
  );
}
