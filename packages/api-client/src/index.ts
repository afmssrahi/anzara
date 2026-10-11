export { ApiError } from './errors';
export { createApiClient } from './client';
export type { ApiClient, RequestOptions } from './client';
export { createAuthClient } from './auth';
export type {
  AuthClient,
  AuthClientConfig,
  AdminAuthData,
  AdminLoginInput,
  AuthTokens,
  CustomerAuthData,
  MeResponse,
  MessageData,
  OtpPurpose,
} from './auth';
export { createProductsClient } from './products';
export type {
  ProductsClient,
  ProductsClientConfig,
  ProductListParams,
  CreateProductBody,
  UpdateProductBody,
  CreateCategoryBody,
  UpdateCategoryBody,
  CreateCollectionBody,
  UpdateCollectionBody,
  UploadedAsset,
} from './products';
export { createAddressesClient } from './addresses';
export type { AddressesClient, CreateAddressBody, UpdateAddressBody } from './addresses';
export { createCartClient } from './cart';
export type { CartClient, AddToCartBody, UpdateCartItemBody } from './cart';
export { createOrdersClient } from './orders';
export type {
  OrdersClient,
  CreateOrderBody,
  OrderListParams,
  AdminOrderListItem,
  UpdateStatusBody,
  UpdateShipmentBody,
  OrderNoteBody,
} from './orders';
export { createSettingsClient } from './settings';
export type { SettingsClient, SiteSetting, UpsertSettingBody } from './settings';
export { createPaymentsClient } from './payments';
export type { PaymentsClient, EnabledPaymentMethodsResponse } from './payments';
export { createCouponsClient } from './coupons';
export type {
  CouponsClient,
  AdminCoupon,
  CouponPreview,
  CreateCouponBody,
  UpdateCouponBody,
  CouponListResponse,
  DiscountType,
} from './coupons';
export { createReviewsClient } from './reviews';
export type {
  ReviewsClient,
  ReviewListResponse,
  AdminReview,
  AdminReviewListResponse,
  CreateReviewBody,
  UpdateReviewBody,
  ModerateReviewBody,
} from './reviews';
export { createWishlistClient } from './wishlist';
export type { WishlistClient } from './wishlist';
export { createContentClient } from './content';
export type {
  ContentClient,
  BannerListResponse,
  PageListResponse,
  CreateBannerBody,
  UpdateBannerBody,
  CreatePageBody,
  UpdatePageBody,
} from './content';
export { createPublicSettingsClient } from './public-settings';
export type { PublicSettingsClient, PublicSettings } from './public-settings';
export { createDashboardClient } from './dashboard';
export type {
  DashboardClient,
  DashboardSummary,
  DashboardLowStockItem,
  DashboardRecentOrder,
} from './dashboard';
