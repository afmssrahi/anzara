import Link from 'next/link';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Anzara
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Sign in to Anzara</h1>
          <p className="mt-1 text-sm text-gray-600">Welcome back. Please enter your details.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
