'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import { LoadingScreen, LanguageSwitcher } from '@anzara/ui';
import { auth } from '../lib/api';
import { useAdminAuthStore } from '../lib/auth-store';
import { useAdminPermissions } from './use-admin-permissions';

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/products', label: 'Products', permission: 'product:view' },
  { href: '/dashboard/categories', label: 'Categories', permission: 'product:view' },
  { href: '/orders', label: 'Orders', permission: 'order:view' },
  { href: '/customers', label: 'Customers', permission: 'customer:view' },
  { href: '/inventory', label: 'Inventory', permission: 'inventory:view' },
  { href: '/coupons', label: 'Coupons', permission: 'coupon:view' },
  { href: '/cms', label: 'Content', permission: 'cms:manage' },
  { href: '/settings', label: 'Settings', permission: 'settings:view' },
  { href: '/admin-users', label: 'Admins', permission: 'admin:user:manage' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken, admin, clear } = useAdminAuthStore();
  const { has } = useAdminPermissions();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!accessToken || !admin) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await auth.me(accessToken);
        if (cancelled) return;
        if (me.type !== 'admin') {
          clear();
          router.replace('/');
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clear();
          router.replace('/');
        }
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isVerifying) return <LoadingScreen label="Checking session…" />;
  if (!admin) return null;

  const visibleNav = NAV.filter((item) => !item.permission || has(item.permission));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-56 shrink-0 border-r bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-4 text-lg font-bold text-brand-primary">
          Anzara Admin
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4 text-xs text-gray-500">
          <p className="font-medium text-gray-700">
            {admin.firstName} {admin.lastName}
          </p>
          <p>{admin.role}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4">
          <h1 className="text-sm font-medium text-gray-700">Anzara Admin</h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={async () => {
                try {
                  await auth.logout();
                } catch {
                  // ignore
                }
                clear();
                router.push('/');
              }}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
