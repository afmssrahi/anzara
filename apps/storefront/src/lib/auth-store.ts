'use client';

/**
 * Lightweight auth store. Persists the access token in localStorage and exposes
 * helpers for the storefront. Refresh token lives in an httpOnly cookie.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomerProfile } from '@anzara/shared-types';

interface AuthState {
  accessToken: string | null;
  user: CustomerProfile | null;
  setSession: (token: string, user: CustomerProfile) => void;
  setUser: (user: CustomerProfile) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (token, user) => set({ accessToken: token, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'anzara.storefront.auth',
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),
    },
  ),
);
