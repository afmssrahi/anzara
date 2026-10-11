/**
 * API request/response types for endpoint contracts.
 */
import type { PaginatedResponse, ApiResponse, ApiError } from './common';
import type { CustomerProfile, AdminUser } from './user';
import type { Product } from './product';
import type { Cart } from './cart';
import type { Order } from './order';

// Auth endpoints
export interface LoginRequest {
  email: string;
  password: string;
}
export type LoginResponse = ApiResponse<{
  user: AdminUser;
  tokens: { accessToken: string; refreshToken: string };
}>;

export interface CustomerRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
export type CustomerRegisterResponse = ApiResponse<{
  user: CustomerProfile;
  tokens: { accessToken: string; refreshToken: string };
}>;

export interface OtpRequest {
  email: string;
  purpose: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';
}

// Product endpoints
export type ProductListResponse = ApiResponse<PaginatedResponse<Product>>;
export type ProductResponse = ApiResponse<Product>;

// Cart endpoints
export type CartResponse = ApiResponse<Cart>;

// Order endpoints
export type OrderListResponse = ApiResponse<PaginatedResponse<Order>>;
export type OrderResponse = ApiResponse<Order>;

// Error response helper
export type ErrorResponse = ApiError;
