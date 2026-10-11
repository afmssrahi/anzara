import {
  createApiClient,
  createAuthClient,
  createProductsClient,
  createAddressesClient,
  createCartClient,
  createOrdersClient,
  createPaymentsClient,
  createCouponsClient,
  createReviewsClient,
  createWishlistClient,
  createContentClient,
  createPublicSettingsClient,
} from '@anzara/api-client';

const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export const api = createApiClient(baseUrl);
export const auth = createAuthClient({ api });
export const products = createProductsClient({ api });
export const addresses = createAddressesClient({ api });
export const cart = createCartClient({ api });
export const orders = createOrdersClient({ api });
export const payments = createPaymentsClient({ api });
export const coupons = createCouponsClient({ api });
export const reviews = createReviewsClient({ api });
export const wishlist = createWishlistClient({ api });
export const content = createContentClient({ api });
export const publicSettings = createPublicSettingsClient({ api });
