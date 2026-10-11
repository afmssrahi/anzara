/**
 * Asset provider interface.
 * The rest of the app talks to this, never to a specific provider.
 * Swap to Cloudinary/S3 by adding a new implementation and choosing it via
 * env (`ASSET_PROVIDER=cloudinary`) without touching the controller.
 */
export interface UploadedAsset {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  bytes: number;
  mimeType: string;
}

export interface AssetProvider {
  /** Persist a file from a buffer and return the public info. */
  upload(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    /** Optional key prefix, e.g. "products/<productId>". */
    folder?: string;
  }): Promise<UploadedAsset>;

  /** Remove an asset by its publicId (or no-op if the provider doesn't support it). */
  remove(publicId: string): Promise<void>;
}
