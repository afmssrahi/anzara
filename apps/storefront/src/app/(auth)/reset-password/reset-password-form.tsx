'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import { Button, FormField, Input, useToast } from '@anzara/ui';
import { auth } from '../../../lib/api';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="space-y-3 text-center text-sm text-gray-700">
        <p>Invalid or missing reset link.</p>
        <Link href="/forgot-password" className="block text-brand-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await auth.resetPassword({ token, newPassword: password });
      success('Password updated. Please sign in.');
      router.push('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) setError('This reset link is invalid or has expired.');
        else setError(err.message);
      } else {
        showError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label="New password" htmlFor="password" required error={error ?? undefined}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasError={Boolean(error)}
        />
      </FormField>
      <FormField label="Confirm password" htmlFor="confirm" required>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </FormField>
      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        Update password
      </Button>
    </form>
  );
}
