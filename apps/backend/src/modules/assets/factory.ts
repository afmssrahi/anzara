/**
 * Resolves the active asset provider based on env (`ASSET_PROVIDER=local|cloudinary`).
 * Cloudinary provider will be added when credentials are available.
 */
import { getEnv } from '@anzara/config';
import type { AssetProvider } from './provider';
import { LocalAssetProvider } from './local-provider';

let cached: AssetProvider | null = null;

export function getAssetProvider(): AssetProvider {
  if (cached) return cached;
  const env = getEnv();
  switch (env.ASSET_PROVIDER) {
    case 'local':
      cached = new LocalAssetProvider();
      break;
    case 'cloudinary':
      throw new Error(
        'Cloudinary provider is not yet implemented. Set ASSET_PROVIDER=local for now.',
      );
    default:
      throw new Error(`Unknown ASSET_PROVIDER: ${env.ASSET_PROVIDER}`);
  }
  return cached;
}
