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
