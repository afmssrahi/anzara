import Link from 'next/link';
import { Suspense } from 'react';
import { VerifyEmailForm } from './verify-email-form';

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Anzara
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Verify your email</h1>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading…</p>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </main>
  );
}
