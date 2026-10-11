'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@anzara/api-client';
import { Button, FormField, Input, useT, useToast } from '@anzara/ui';
import { auth } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export function RegisterForm() {
  const router = useRouter();
  const { t } = useT();
  const { success, error: showError } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email';
    if (form.password.length < 8) next.password = t.auth.passwordTooShort;
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const data = await auth.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        ...(form.phone ? { phone: form.phone } : {}),
      });
      setSession(data.accessToken, data.user);
      success('Account created. Check your email to verify.');
      router.push('/account');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) showError(t.auth.emailTaken);
        else showError(err.message);
      } else {
        showError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t.auth.firstName} htmlFor="firstName" required error={errors.firstName}>
          <Input
            id="firstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            hasError={Boolean(errors.firstName)}
          />
        </FormField>
        <FormField label={t.auth.lastName} htmlFor="lastName" required error={errors.lastName}>
          <Input
            id="lastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            hasError={Boolean(errors.lastName)}
          />
        </FormField>
      </div>

      <FormField label={t.auth.email} htmlFor="email" required error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          hasError={Boolean(errors.email)}
        />
      </FormField>

      <FormField label={t.auth.phone} htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+8801XXXXXXXXX"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          hasError={Boolean(errors.phone)}
        />
      </FormField>

      <FormField label={t.auth.password} htmlFor="password" required error={errors.password}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          hasError={Boolean(errors.password)}
        />
      </FormField>

      <FormField
        label={t.auth.confirmPassword}
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          hasError={Boolean(errors.confirmPassword)}
        />
      </FormField>

      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        {t.auth.signUp}
      </Button>

      <p className="text-center text-sm text-gray-600">
        {t.auth.haveAccount}{' '}
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          {t.auth.signIn}
        </Link>
      </p>
    </form>
  );
}
