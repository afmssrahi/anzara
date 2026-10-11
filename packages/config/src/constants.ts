/**
 * Application-wide constants.
 * Values that never change at runtime, or change only with deploy.
 */

/** Default brand identity — overridable from admin settings. */
export const DEFAULT_BRAND = {
  name: 'Anzara',
  tagline: 'Timeless Elegance',
  primaryColor: '#0F4C5C',
  accentColor: '#E36414',
  logoUrl: null,
  faviconUrl: null,
} as const;

/** Supported locales. First entry is the default. */
export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];

/** Supported currency. */
export const CURRENCY = {
  code: 'BDT',
  symbol: '৳',
  name: 'Bangladeshi Taka',
} as const;

/** Pagination defaults. */
export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

/** Cart reservation time in minutes. */
export const CART_RESERVATION_MINUTES = 15;

/** Order states. */
export const ORDER_STATES = [
  'PENDING',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

/** Payment methods. */
export const PAYMENT_METHODS = ['COD', 'BKASH', 'NAGAD', 'CARD', 'ROCKET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Payment statuses. */
export const PAYMENT_STATUSES = ['PENDING', 'VERIFIED', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** User roles. */
export const ROLES = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Admin permission keys. Used for fine-grained authorization. */
export const PERMISSIONS = {
  // Products
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  // Orders
  ORDER_VIEW: 'order:view',
  ORDER_UPDATE: 'order:update',
  ORDER_CANCEL: 'order:cancel',
  ORDER_REFUND: 'order:refund',
  // Customers
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_UPDATE: 'customer:update',
  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_UPDATE: 'inventory:update',
  // Coupons
  COUPON_VIEW: 'coupon:view',
  COUPON_MANAGE: 'coupon:manage',
  // Reviews
  REVIEW_MODERATE: 'review:moderate',
  // CMS
  CMS_MANAGE: 'cms:manage',
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  // Integrations
  INTEGRATION_MANAGE: 'integration:manage',
  // Admin users
  ADMIN_USER_MANAGE: 'admin:user:manage',
  // Reports
  REPORT_VIEW: 'report:view',
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Super admin gets all permissions automatically. */
export const SUPER_ADMIN_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
