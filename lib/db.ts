import { PrismaClient } from '@prisma/client';

/**
 * Prisma Singleton Client
 * 
 * Prevents multiple instances during hot-reload in development.
 * This is critical for avoiding "Too many clients" errors and connection pool exhaustion.
 * 
 * Pattern: Global singleton that persists across hot reloads
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
