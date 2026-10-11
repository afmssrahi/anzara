import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Anzara Admin</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage your store</p>
        </div>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Sign in
          </button>
        </form>
        <p className="text-center text-xs text-gray-500">
          Auth wired up in Phase 1. Default credentials seeded in database.
        </p>
        <p className="text-center text-xs">
          <Link href="/" className="text-gray-500 hover:text-gray-900">
            ← Back to storefront
          </Link>
        </p>
      </div>
    </main>
  );
}
