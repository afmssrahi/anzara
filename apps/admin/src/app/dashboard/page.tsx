'use client';

import Link from 'next/link';
import { AdminShell } from '../../lib/guard';
import { useAdminAuthStore } from '../../lib/auth-store';

export default function DashboardPage() {
  const admin = useAdminAuthStore((s) => s.admin);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {admin?.firstName ?? 'Admin'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Here&apos;s what&apos;s happening with your store.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Orders today" value="—" hint="Connect data in Phase 3" />
          <StatCard label="Revenue (30d)" value="—" hint="BDT" />
          <StatCard label="Pending reviews" value="—" hint="Phase 4" />
          <StatCard label="Low stock items" value="—" hint="Phase 3" />
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">Phase 2 in progress</h3>
          <p className="mt-1 text-sm text-gray-600">
            Products, categories, and asset uploads are live. Cart, checkout, and orders come in
            Phase 3.
          </p>
          <div className="mt-4 flex gap-3 text-sm">
            <Link href="/dashboard/products" className="text-brand-primary hover:underline">
              Products →
            </Link>
            <Link href="/dashboard/categories" className="text-brand-primary hover:underline">
              Categories →
            </Link>
            <Link href="/settings" className="text-brand-primary hover:underline">
              Settings →
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
