'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@anzara/shared-types';

interface AdminAuthState {
  accessToken: string | null;
  admin: AdminUser | null;
  /** 2FA challenge token, set when login needs verification. */
  challengeToken: string | null;
  setSession: (token: string, admin: AdminUser) => void;
  setChallenge: (token: string) => void;
  clear: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      admin: null,
      challengeToken: null,
      setSession: (token, admin) => set({ accessToken: token, admin, challengeToken: null }),
      setChallenge: (token) => set({ challengeToken: token }),
      clear: () => set({ accessToken: null, admin: null, challengeToken: null }),
    }),
    {
      name: 'anzara.admin.auth',
      partialize: (s) => ({ accessToken: s.accessToken, admin: s.admin }),
    },
  ),
);
