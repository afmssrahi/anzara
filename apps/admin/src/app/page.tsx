import Link from 'next/link';
import { AdminLoginForm } from './admin-login-form';

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Anzara Admin</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage your store</p>
        </div>
        <AdminLoginForm />
        <p className="text-center text-xs text-gray-500">
          Default credentials are seeded during setup.
        </p>
        <p className="text-center text-xs">
          <Link href="http://localhost:3000" className="text-gray-500 hover:text-gray-900">
            ← Back to storefront
          </Link>
        </p>
      </div>
    </main>
  );
}
