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

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';

export interface AuthClientConfig {
  api: ApiClient;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface CustomerAuthData {
  user: CustomerProfile;
  accessToken: string;
  expiresIn: number;
}

export interface AdminAuthData {
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
  };
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

export interface AdminLoginInput {
  email: string;
  password: string;
  totpCode?: string;
}

export function createAuthClient({ api }: AuthClientConfig) {
  return {
    // Customer endpoints ------------------------------------------------
    register(body: CustomerRegisterRequest) {
      return api.request<CustomerAuthData>('/api/auth/register', {
        method: 'POST',
        body,
      });
    },

    customerLogin(body: LoginRequest) {
      return api.request<CustomerAuthData>('/api/auth/login', {
        method: 'POST',
        body,
        withCredentials: true,
      });
    },

    // OTP (email verification, passwordless login, etc.) -----------------
    requestOtp(body: { email: string; purpose: OtpPurpose }) {
      return api.request<MessageData>('/api/auth/otp/request', {
        method: 'POST',
        body,
      });
    },

    verifyOtp(body: { email: string; code: string; purpose: OtpPurpose }) {
      return api.request<MessageData>('/api/auth/otp/verify', {
        method: 'POST',
        body,
      });
    },

    // Admin endpoints ----------------------------------------------------
    adminLogin(body: AdminLoginInput) {
      return api.request<AdminAuthData>('/api/auth/admin/login', {
        method: 'POST',
        body,
        withCredentials: true,
      });
    },

    // TOTP setup / enable / disable (admin only) -------------------------
    setupTotp(token: string) {
      return api.request<{ qrCode: string; secret: string }>('/api/auth/2fa/setup', {
        method: 'POST',
        token,
      });
    },

    enableTotp(body: { code: string }, token: string) {
      return api.request<MessageData>('/api/auth/2fa/enable', {
        method: 'POST',
        body,
        token,
      });
    },

    disableTotp(token: string) {
      return api.request<MessageData>('/api/auth/2fa/disable', {
        method: 'POST',
        token,
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

    updateProfile(
      body: { firstName?: string; lastName?: string; phone?: string | null },
      token: string,
    ) {
      return api.request<CustomerProfile>('/api/auth/profile', {
        method: 'PATCH',
        body,
        token,
      });
    },
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
export type { AdminUser, AuthUser, CustomerProfile, CustomerRegisterRequest, LoginRequest };
