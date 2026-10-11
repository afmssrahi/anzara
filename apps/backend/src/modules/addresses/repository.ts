/**
 * Addresses module - data access layer.
 * All Prisma queries for addresses live here.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

export const addressesRepository = {
  async listByUser(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async findById(id: string, userId: string) {
    return prisma.address.findFirst({ where: { id, userId } });
  },

  async create(userId: string, data: Prisma.AddressCreateWithoutUserInput) {
    return prisma.$transaction(async (tx) => {
      // If this address is the default, unset any existing default first.
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({ data: { ...data, user: { connect: { id: userId } } } });
    });
  },

  async update(id: string, userId: string, data: Prisma.AddressUpdateInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, userId } });
      if (!existing) return null;

      // If marking this as default, unset any other default first.
      if (data.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id }, data });
    });
  },

  async remove(id: string, userId: string) {
    // Ensure the address belongs to the user before deleting.
    const existing = await prisma.address.findFirst({ where: { id, userId } });
    if (!existing) return false;
    await prisma.address.delete({ where: { id } });
    return true;
  },
};
