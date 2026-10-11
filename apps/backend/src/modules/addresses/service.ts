/**
 * Addresses module - business logic.
 */
import { addressesRepository } from './repository';
import { toAddressDto } from './dto';
import { NotFoundError } from '../../lib/errors';
import type { CreateAddressInput, UpdateAddressInput } from '@anzara/validators';

export const addressesService = {
  async list(userId: string) {
    const rows = await addressesRepository.listByUser(userId);
    return rows.map(toAddressDto);
  },

  async getById(id: string, userId: string) {
    const row = await addressesRepository.findById(id, userId);
    if (!row) throw new NotFoundError('Address not found');
    return toAddressDto(row);
  },

  async create(userId: string, input: CreateAddressInput) {
    const row = await addressesRepository.create(userId, {
      label: input.label ?? null,
      fullName: input.fullName,
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      city: input.city,
      district: input.district,
      division: input.division,
      postalCode: input.postalCode ?? null,
      country: input.country,
      isDefault: input.isDefault,
    });
    return toAddressDto(row);
  },

  async update(id: string, userId: string, input: UpdateAddressInput) {
    const updated = await addressesRepository.update(id, userId, {
      ...(input.label !== undefined ? { label: input.label ?? null } : {}),
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
      ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 ?? null } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.district !== undefined ? { district: input.district } : {}),
      ...(input.division !== undefined ? { division: input.division } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode ?? null } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    });
    if (!updated) throw new NotFoundError('Address not found');
    return toAddressDto(updated);
  },

  async remove(id: string, userId: string) {
    const ok = await addressesRepository.remove(id, userId);
    if (!ok) throw new NotFoundError('Address not found');
  },
};
