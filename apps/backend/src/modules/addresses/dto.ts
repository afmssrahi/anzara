/**
 * Address DTO helpers.
 * Convert Prisma row to the shared-types UserAddress shape.
 */
import type { Address as PrismaAddress } from '@prisma/client';
import type { UserAddress } from '@anzara/shared-types';

export function toAddressDto(a: PrismaAddress): UserAddress {
  return {
    id: a.id,
    ...(a.label ? { label: a.label } : {}),
    fullName: a.fullName,
    phone: a.phone,
    addressLine1: a.addressLine1,
    ...(a.addressLine2 ? { addressLine2: a.addressLine2 } : {}),
    city: a.city,
    district: a.district,
    division: a.division,
    ...(a.postalCode ? { postalCode: a.postalCode } : {}),
    country: a.country,
    isDefault: a.isDefault,
  };
}
