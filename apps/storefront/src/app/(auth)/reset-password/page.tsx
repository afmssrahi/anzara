import Link from 'next/link';
import { Suspense } from 'react';
import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Anzara
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Set a new password</h1>
          <p className="mt-1 text-sm text-gray-600">Enter a new password to finish resetting.</p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
