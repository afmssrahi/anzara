/**
 * Addresses API surface (customer only).
 */
import type { ApiClient } from './client';
import type { UserAddress } from '@anzara/shared-types';

export interface CreateAddressBody {
  label?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  division: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

export type UpdateAddressBody = Partial<CreateAddressBody>;

export function createAddressesClient({ api }: { api: ApiClient }) {
  return {
    list(token: string) {
      return api.request<UserAddress[]>('/api/addresses', { token });
    },
    get(id: string, token: string) {
      return api.request<UserAddress>(`/api/addresses/${id}`, { token });
    },
    create(body: CreateAddressBody, token: string) {
      return api.request<UserAddress>('/api/addresses', {
        method: 'POST',
        body,
        token,
      });
    },
    update(id: string, body: UpdateAddressBody, token: string) {
      return api.request<UserAddress>(`/api/addresses/${id}`, {
        method: 'PATCH',
        body,
        token,
      });
    },
    remove(id: string, token: string) {
      return api.request<{ message: string }>(`/api/addresses/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  };
}

export type AddressesClient = ReturnType<typeof createAddressesClient>;
