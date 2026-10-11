'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@anzara/api-client';
import { Button, FormField, Input, useToast } from '@anzara/ui';
import { auth } from '../lib/api';
import { useAdminAuthStore } from '../lib/auth-store';

export function AdminLoginForm() {
  const { success, error: showError } = useToast();
  const setSession = useAdminAuthStore((s) => s.setSession);
  const setChallenge = useAdminAuthStore((s) => s.setChallenge);
  const storedChallenge = useAdminAuthStore((s) => s.challengeToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'verify-2fa'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; code?: string }>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    try {
      if (stage === 'credentials') {
        const data = await auth.adminLogin({ email, password });
        if (data.requires2FA) {
          if (data.challengeToken) setChallenge(data.challengeToken);
          setStage('verify-2fa');
          success('Enter your 2FA code');
        } else if (data.admin && data.accessToken) {
          setSession(data.accessToken, data.admin);
          window.location.href = '/dashboard';
        }
      } else {
        // 2FA verification
        if (!storedChallenge) {
          showError('Session expired, please sign in again.');
          setStage('credentials');
          return;
        }
        const data = await auth.verifyAdmin2FA({
          email,
          code,
          challengeToken: storedChallenge,
        });
        setSession(data.accessToken, data.admin);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) showError('Invalid email or password');
        else showError(err.message);
      } else {
        showError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (stage === 'verify-2fa') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Verification code" htmlFor="code" required error={errors.code}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            hasError={Boolean(errors.code)}
            placeholder="123456"
          />
        </FormField>
        <Button type="submit" fullWidth isLoading={isLoading} size="lg">
          Verify
        </Button>
        <button
          type="button"
          onClick={() => setStage('credentials')}
          className="block w-full text-center text-xs text-gray-500 hover:underline"
        >
          ← Back to sign in
        </button>
      </form>
    );
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
      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        Sign in
      </Button>
    </form>
  );
}
