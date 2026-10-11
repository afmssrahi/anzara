'use client';

import { useAdminAuthStore } from './auth-store';

/**
 * Hook to check whether the signed-in admin has a given permission.
 * Returns `true` for everything when the admin is a SUPER_ADMIN.
 */
export function useAdminPermissions() {
  const admin = useAdminAuthStore((s) => s.admin);
  const permissions = admin?.permissions ?? [];

  function has(permission: string): boolean {
    if (!admin) return false;
    if (admin.role === 'SUPER_ADMIN') return true;
    return permissions.includes(permission);
  }

  return { has, permissions, isSuperAdmin: admin?.role === 'SUPER_ADMIN' };
}
