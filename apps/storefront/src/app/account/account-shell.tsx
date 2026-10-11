'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@anzara/api-client';
import { Button, FormField, Input, useToast } from '@anzara/ui';
import { auth } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';

type Tab = 'profile' | 'password';

export function AccountShell() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { accessToken, user, setUser, clear } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [isVerifying, setIsVerifying] = useState(false);

  // Restore session on mount: if we have a token, hit /me to confirm
  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await auth.me(accessToken);
        if (cancelled) return;
        // data.user here is either CustomerProfile or AdminUser; we only show
        // customers on the storefront account page.
        if (data.type !== 'customer') {
          clear();
          router.push('/login');
          return;
        }
        // Narrow the union — only CustomerProfile is left at this point.
        setUser(data.user as import('@anzara/shared-types').CustomerProfile);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clear();
          router.push('/login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-center text-gray-500">Loading…</div>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">My account</h1>
        <span className="text-sm text-gray-500">Welcome, {user.firstName}</span>
      </div>

      <div className="flex gap-2 border-b">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          Profile
        </TabButton>
        <TabButton active={tab === 'password'} onClick={() => setTab('password')}>
          Change password
        </TabButton>
      </div>

      {tab === 'profile' ? (
        <ProfileForm
          initialFirstName={user.firstName}
          initialLastName={user.lastName}
          initialPhone={user.phone ?? ''}
          onSaved={(updated) => {
            setUser(updated);
            success('Profile updated');
          }}
          onError={showError}
          token={accessToken!}
        />
      ) : (
        <PasswordForm
          onSuccess={() => {
            success('Password changed');
            setTab('profile');
          }}
          onError={showError}
          token={accessToken!}
        />
      )}

      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm">
        <Link href="/orders" className="text-gray-600 hover:text-gray-900">
          View my orders →
        </Link>
        <Link href="/account/wishlist" className="text-gray-600 hover:text-gray-900">
          My wishlist →
        </Link>
        <button
          type="button"
          onClick={async () => {
            setIsVerifying(true);
            try {
              await auth.logout();
            } catch {
              // ignore — clear local state anyway
            }
            clear();
            success('Signed out');
            router.push('/');
          }}
          disabled={isVerifying}
          className="text-red-600 hover:text-red-800"
        >
          {isVerifying ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'border-b-2 border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary'
          : 'px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900'
      }
    >
      {children}
    </button>
  );
}

function ProfileForm({
  initialFirstName,
  initialLastName,
  initialPhone,
  onSaved,
  onError,
  token,
}: {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  onSaved: (updated: import('@anzara/shared-types').CustomerProfile) => void;
  onError: (msg: string) => void;
  token: string;
}) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updated = await auth.updateProfile(
        {
          firstName,
          lastName,
          phone: phone.trim() === '' ? null : phone,
        },
        token,
      );
      onSaved(updated);
    } catch (err) {
      if (err instanceof ApiError) onError(err.message);
      else onError('Network error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First name" htmlFor="firstName" required>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Last name" htmlFor="lastName" required>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </FormField>
      </div>
      <FormField label="Phone" htmlFor="phone" hint="Optional. Format: +8801XXXXXXXXX">
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      <Button type="submit" isLoading={isLoading}>
        Save changes
      </Button>
    </form>
  );
}

function PasswordForm({
  onSuccess,
  onError,
  token,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
  token: string;
}) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    if (newPassword.length < 8) {
      setLocalError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirm) {
      setLocalError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await auth.changePassword({ currentPassword, newPassword }, token);
      setCurrent('');
      setNext('');
      setConfirm('');
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) onError(err.message);
      else onError('Network error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
      <FormField label="Current password" htmlFor="current" required>
        <Input
          id="current"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </FormField>
      <FormField label="New password" htmlFor="new" required>
        <Input
          id="new"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </FormField>
      <FormField
        label="Confirm new password"
        htmlFor="confirm"
        required
        error={localError ?? undefined}
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </FormField>
      <Button type="submit" isLoading={isLoading}>
        Update password
      </Button>
    </form>
  );
}
