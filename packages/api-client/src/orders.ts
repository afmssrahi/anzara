/**
 * Orders API surface — customer + admin surfaces in one file because the
 * types and shapes are similar enough that splitting costs more than it
 * saves.
 */
import type { ApiClient } from './client';
import type { Order, OrderStatus, PaginatedResponse, UserAddress } from '@anzara/shared-types';

export interface CreateOrderBody {
  paymentMethod: 'COD' | 'BKASH' | 'NAGAD' | 'CARD' | 'ROCKET';
  shippingAddress: Omit<UserAddress, 'id' | 'isDefault' | 'label'> & {
    label?: string;
    isDefault?: boolean;
  };
  billingAddress?: CreateOrderBody['shippingAddress'];
  couponCode?: string;
  customerNote?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdminOrderListItem extends Order {
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

export interface UpdateStatusBody {
  status: OrderStatus;
  reason?: string;
}

export interface UpdateShipmentBody {
  status?:
    | 'PENDING'
    | 'PICKED_UP'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'FAILED'
    | 'RETURNED';
  trackingNumber?: string;
  notes?: string;
}

export interface OrderNoteBody {
  content: string;
  isInternal?: boolean;
}

function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export function createOrdersClient({ api }: { api: ApiClient }) {
  return {
    // ==================== Customer ====================
    place(body: CreateOrderBody, token: string) {
      return api.request<Order>('/api/orders', {
        method: 'POST',
        body,
        token,
      });
    },
    listMine(params: OrderListParams = {}, token: string) {
      return api.request<PaginatedResponse<Order>>(
        `/api/orders${toQuery(params as Record<string, unknown>)}`,
        { token },
      );
    },
    getMine(id: string, token: string) {
      return api.request<Order>(`/api/orders/${id}`, { token });
    },
    cancelMine(id: string, token: string) {
      return api.request<Order>(`/api/orders/${id}/cancel`, {
        method: 'POST',
        token,
      });
    },

    // ==================== Admin ====================
    admin: {
      list(params: OrderListParams = {}, token: string) {
        return api.request<PaginatedResponse<AdminOrderListItem>>(
          `/api/admin/orders${toQuery(params as Record<string, unknown>)}`,
          { token },
        );
      },
      get(id: string, token: string) {
        return api.request<AdminOrderListItem>(`/api/admin/orders/${id}`, {
          token,
        });
      },
      updateStatus(id: string, body: UpdateStatusBody, token: string) {
        return api.request<AdminOrderListItem>(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          body,
          token,
        });
      },
      updateShipment(id: string, body: UpdateShipmentBody, token: string) {
        return api.request<AdminOrderListItem>(`/api/admin/orders/${id}/shipment`, {
          method: 'PATCH',
          body,
          token,
        });
      },
      addNote(id: string, body: OrderNoteBody, token: string) {
        return api.request<AdminOrderListItem>(`/api/admin/orders/${id}/notes`, {
          method: 'POST',
          body,
          token,
        });
      },
    },
  };
}

export type OrdersClient = ReturnType<typeof createOrdersClient>;
