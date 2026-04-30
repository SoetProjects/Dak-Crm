import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createClient();
  // Always cache — in production this reuses the connection across invocations
  // within the same container; in dev it prevents "too many clients" warnings.
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Lazy Prisma proxy.
 *
 * `new PrismaClient()` reads DATABASE_URL at construction time and throws
 * `PrismaClientInitializationError` if the variable is absent — crashing the
 * module before any `isDatabaseReady()` guard can run.
 *
 * This Proxy defers instantiation until the first property access, so pages
 * that call `isDatabaseReady()` first can handle the missing-var case cleanly.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
