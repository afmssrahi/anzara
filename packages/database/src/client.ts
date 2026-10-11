/**
 * Singleton Prisma client.
 * Reused across the backend to avoid exhausting connection pool.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  global.prisma = prisma;
}

export default prisma;
