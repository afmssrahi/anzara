import Link from 'next/link';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Anzara
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-600">
            Join Anzara for a faster checkout and order tracking.
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
