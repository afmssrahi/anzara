/**
 * Auth API surface — calls backend endpoints under /api/auth/*.
 * Centralized here so the storefront and admin apps share a single client.
 *
 * The base client already unwraps the backend's `{ success, data }` envelope,
 * so the response types here describe the *inner* data shape.
 */
import type { ApiClient } from './client';
import type {
  AdminUser,
  AuthUser,
  CustomerProfile,
  CustomerRegisterRequest,
  LoginRequest,
} from '@anzara/shared-types';

export interface AuthClientConfig {
  api: ApiClient;
}

export interface CustomerRegisterData {
  user: CustomerProfile;
  accessToken: string;
  expiresIn: number;
}

export interface CustomerLoginData {
  user: CustomerProfile;
  accessToken: string;
  expiresIn: number;
}

export interface AdminLoginData {
  /** True when 2FA challenge must be completed before tokens are issued. */
  requires2FA: boolean;
  /** Opaque challenge token to pass to `verifyAdmin2FA`. */
  challengeToken?: string;
  /** Set when 2FA is not required or already completed. */
  admin?: AdminUser;
  accessToken?: string;
  expiresIn?: number;
}

export interface VerifyAdmin2FAData {
  admin: AdminUser;
  accessToken: string;
  expiresIn: number;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface MeResponse {
  type: 'admin' | 'customer';
  user: AuthUser;
}

export interface MessageData {
  message: string;
}

export function createAuthClient({ api }: AuthClientConfig) {
  return {
    // Customer endpoints ------------------------------------------------
    register(body: CustomerRegisterRequest) {
      return api.request<CustomerRegisterData>('/api/auth/register', {
        method: 'POST',
        body,
      });
    },

    verifyEmail(body: { email: string; otp: string }) {
      return api.request<MessageData>('/api/auth/verify-email', {
        method: 'POST',
        body,
      });
    },

    resendVerification(body: { email: string }) {
      return api.request<MessageData>('/api/auth/resend-verification', {
        method: 'POST',
        body,
      });
    },

    customerLogin(body: LoginRequest) {
      return api.request<CustomerLoginData>('/api/auth/login', {
        method: 'POST',
        body,
        withCredentials: true,
      });
    },

    // Admin endpoints ----------------------------------------------------
    adminLogin(body: LoginRequest) {
      return api.request<AdminLoginData>('/api/auth/admin/login', {
        method: 'POST',
        body,
        withCredentials: true,
      });
    },

    verifyAdmin2FA(body: { email: string; code: string; challengeToken: string }) {
      return api.request<VerifyAdmin2FAData>('/api/auth/admin/verify-2fa', {
        method: 'POST',
        body,
        withCredentials: true,
      });
    },

    // Session ------------------------------------------------------------
    me(token: string) {
      return api.request<MeResponse>('/api/auth/me', { token });
    },

    refresh() {
      return api.request<AuthTokens>('/api/auth/refresh', {
        method: 'POST',
        withCredentials: true,
      });
    },

    logout() {
      return api.request<MessageData>('/api/auth/logout', {
        method: 'POST',
        withCredentials: true,
      });
    },

    // Password reset -----------------------------------------------------
    forgotPassword(body: { email: string }) {
      return api.request<MessageData>('/api/auth/forgot-password', {
        method: 'POST',
        body,
      });
    },

    resetPassword(body: { token: string; newPassword: string }) {
      return api.request<MessageData>('/api/auth/reset-password', {
        method: 'POST',
        body,
      });
    },

    changePassword(body: { currentPassword: string; newPassword: string }, token: string) {
      return api.request<MessageData>('/api/auth/change-password', {
        method: 'POST',
        body,
        token,
      });
    },
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
