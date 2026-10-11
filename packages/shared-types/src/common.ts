/**
 * Common types used across the platform.
 */

export type Locale = 'en' | 'bn';

export type LocalizedString = Record<Locale, string>;

export type LocalizedRichText = Record<Locale, string>;

/** ISO 8601 timestamp. */
export type ISODateString = string;

/** Pagination request. */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Pagination metadata in responses. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Paginated response wrapper. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Generic API success response. */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Generic API error response. */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Money value in BDT (paisa). Use BDT format helpers for display. */
export interface Money {
  amount: number;
  currency: 'BDT';
}
