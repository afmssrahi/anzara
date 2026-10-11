'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import { Button, FormField, Input, useT, useToast } from '@anzara/ui';
import { auth } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

export function LoginForm() {
  const router = useRouter();
  const { t } = useT();
  const { success, error: showError } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setIsLoading(true);
    try {
      const data = await auth.customerLogin({ email, password });
      setSession(data.accessToken, data.user);
      success(`Welcome back, ${data.user.firstName}!`);
      router.push('/account');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          showError(t.auth.invalidCredentials);
        } else {
          showError(err.message);
        }
      } else {
        showError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label={t.auth.email} htmlFor="email" required error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hasError={Boolean(fieldErrors.email)}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField label={t.auth.password} htmlFor="password" required error={fieldErrors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasError={Boolean(fieldErrors.password)}
        />
      </FormField>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-primary hover:underline">
          {t.auth.forgotPassword}
        </Link>
      </div>

      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        {t.auth.signIn}
      </Button>

      <p className="text-center text-sm text-gray-600">
        {t.auth.noAccount}{' '}
        <Link href="/register" className="font-medium text-brand-primary hover:underline">
          {t.auth.createAccount}
        </Link>
      </p>
    </form>
  );
}
