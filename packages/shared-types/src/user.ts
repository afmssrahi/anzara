/**
 * User-related types.
 */
import type { ISODateString } from './common';

export interface UserAddress {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  division: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  preferredLocale: 'en' | 'bn';
  acceptsMarketing: boolean;
  addresses: UserAddress[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role:
    | 'ADMIN'
    | 'SUPER_ADMIN'
    | 'PRODUCT_MANAGER'
    | 'INVENTORY_MANAGER'
    | 'ORDER_MANAGER'
    | 'CUSTOMER_SUPPORT'
    | 'CONTENT_MANAGER';
  permissions: string[];
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: ISODateString;
  createdAt: ISODateString;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: ISODateString;
  user: CustomerProfile | AdminUser;
}

/** Either a customer or an admin — the shape used by the `/me` endpoint. */
export type AuthUser = CustomerProfile | AdminUser;
