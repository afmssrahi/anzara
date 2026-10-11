'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import { Button, FormField, Input, useToast } from '@anzara/ui';
import { auth } from '../../../lib/api';

const RESEND_COOLDOWN = 60;

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const email = searchParams.get('email') ?? '';

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email) {
    return (
      <div className="space-y-3 text-center text-sm text-gray-700">
        <p>Missing email. Please register first.</p>
        <Link href="/register" className="block text-brand-primary hover:underline">
          Create an account
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setIsLoading(true);
    try {
      await auth.verifyOtp({ email, code, purpose: 'REGISTER' });
      success('Email verified');
      router.push('/account');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) setError('Invalid or expired code');
        else setError(err.message);
      } else {
        showError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    try {
      await auth.requestOtp({ email, purpose: 'REGISTER' });
      success('Code resent');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError('Network error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-gray-600">
        We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your account.
      </p>
      <FormField label="Verification code" htmlFor="code" required error={error ?? undefined}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          hasError={Boolean(error)}
          placeholder="123456"
        />
      </FormField>
      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        Verify
      </Button>
      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0}
        className="block w-full text-center text-sm text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </button>
      <Link href="/login" className="block text-center text-sm text-gray-500 hover:underline">
        ← Back to sign in
      </Link>
    </form>
  );
}
