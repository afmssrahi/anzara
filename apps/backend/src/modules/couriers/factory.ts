/**
 * Resolves the active courier provider.
 *
 * Today: always `manual`. The factory exists so when Pathao / Steadfast /
 * RedX credentials land, adding them is a one-case change here + a new
 * provider file. No call site, controller, service, UI, or schema needs
 * to change.
 *
 * To add Pathao (example):
 *   1. Add `PATHAO_CLIENT_ID` and `PATHAO_CLIENT_SECRET` to env.
 *   2. Create `pathao-provider.ts` that implements `CourierProvider` and
 *      calls the Pathao merchant API.
 *   3. Add a case below keyed off `PATHAO_CLIENT_ID` being set.
 */
import type { CourierProvider } from './provider';
import { manualCourierProvider } from './manual-provider';

/** The set of courier providers the admin can choose from today. */
export const ENABLED_COURIER_PROVIDERS = ['manual'] as const;
export type EnabledCourierProvider = (typeof ENABLED_COURIER_PROVIDERS)[number];

const REGISTRY: Record<EnabledCourierProvider, CourierProvider> = {
  manual: manualCourierProvider,
  // When PATHAO_CLIENT_ID is set, add:  pathao: pathaoProvider,
  // When STEADFAST_API_KEY is set:     steadfast: steadfastProvider,
  // When REDX_API_TOKEN is set:        redx: redxProvider,
};

export function getCourierProvider(id: string): CourierProvider {
  if (id in REGISTRY) {
    return REGISTRY[id as EnabledCourierProvider];
  }
  throw new Error(
    `Courier provider "${id}" is not enabled. ` +
      `Enabled providers: ${ENABLED_COURIER_PROVIDERS.join(', ')}. ` +
      `See apps/backend/src/modules/couriers/factory.ts to add a new one.`,
  );
}

/** Used by admin UIs to render a "Provider" select. */
export function listCourierProviders(): Array<{ id: string; label: string }> {
  return Object.values(REGISTRY).map((p) => ({ id: p.id, label: p.label }));
}
