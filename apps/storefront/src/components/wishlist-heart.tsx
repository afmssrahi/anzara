'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import { useToast } from '@anzara/ui';
import { wishlist } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

interface Props {
  productId: string;
  productSlug: string;
  className?: string;
}

export function WishlistHeart({ productId, productSlug, className }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setHasChecked(true);
      return;
    }
    let cancelled = false;
    wishlist
      .check(productId, accessToken)
      .then((res) => {
        if (!cancelled) setIsInWishlist(res.inWishlist);
      })
      .catch(() => {
        /* non-critical */
      })
      .finally(() => {
        if (!cancelled) setHasChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, productId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!accessToken) {
      router.push(`/login?return=/products/${productSlug}`);
      return;
    }
    setIsLoading(true);
    try {
      if (isInWishlist) {
        await wishlist.remove(productId, accessToken);
        setIsInWishlist(false);
        success('Removed from wishlist');
      } else {
        await wishlist.add(productId, accessToken);
        setIsInWishlist(true);
        success('Saved to wishlist');
      }
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Could not update wishlist');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isLoading || !hasChecked}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      title={isInWishlist ? 'In your wishlist' : 'Add to wishlist'}
      className={
        className ??
        'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white disabled:opacity-50'
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill={isInWishlist ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        className={isInWishlist ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-gray-500'}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-7-4.5-9.5-9.5C1 7 4 4 7 4c2 0 3.5 1.5 5 3 1.5-1.5 3-3 5-3 3 0 6 3 4.5 7.5C19 16.5 12 21 12 21z"
        />
      </svg>
    </button>
  );
}
