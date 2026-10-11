'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import { Button, FormField, Input } from '@anzara/ui';
import { auth } from '../../../lib/api';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await auth.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-gray-700">
          If an account exists for <strong>{email}</strong>, a reset link has been sent.
        </p>
        <Link href="/login" className="block text-sm text-brand-primary hover:underline">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label="Email" htmlFor="email" required error={error ?? undefined}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hasError={Boolean(error)}
          placeholder="you@example.com"
        />
      </FormField>
      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        Send reset link
      </Button>
      <p className="text-center text-sm text-gray-600">
        Remembered your password?{' '}
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
