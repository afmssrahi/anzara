'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@anzara/api-client';
import type { AdminUser } from '@anzara/shared-types';
import { Button, FormField, Input, useToast } from '@anzara/ui';
import { auth } from '../lib/api';
import { useAdminAuthStore } from '../lib/auth-store';

export function AdminLoginForm() {
  const { success, error: showError } = useToast();
  const setSession = useAdminAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; totp?: string }>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    try {
      const body: { email: string; password: string; totpCode?: string } = { email, password };
      if (needsTotp && totpCode) body.totpCode = totpCode;
      const data = await auth.adminLogin(body);
      setSession(data.accessToken, {
        id: data.admin.id,
        email: data.admin.email,
        firstName: data.admin.firstName,
        lastName: data.admin.lastName,
        role: data.admin.role as AdminUser['role'],
        permissions: data.admin.permissions,
        isActive: true,
        twoFactorEnabled: needsTotp,
        createdAt: new Date().toISOString(),
      });
      success(`Welcome, ${data.admin.firstName}`);
      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof ApiError) {
        // Backend throws BadRequestError with code "TWO_FACTOR_REQUIRED" when
        // the admin has 2FA enabled but no TOTP code was provided.
        if (err.code === 'TWO_FACTOR_REQUIRED') {
          setNeedsTotp(true);
          success('Enter your 2FA code to continue');
        } else if (err.status === 401) {
          showError('Invalid email or password');
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Email" htmlFor="email" required error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hasError={Boolean(errors.email)}
        />
      </FormField>
      <FormField label="Password" htmlFor="password" required error={errors.password}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasError={Boolean(errors.password)}
        />
      </FormField>
      {needsTotp && (
        <FormField
          label="2FA code"
          htmlFor="totp"
          required
          error={errors.totp}
          hint="Open your authenticator app"
        >
          <Input
            id="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            hasError={Boolean(errors.totp)}
            placeholder="123456"
          />
        </FormField>
      )}
      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        {needsTotp ? 'Verify' : 'Sign in'}
      </Button>
    </form>
  );
}
