import { PrismaClient } from "@prisma/client";

function pooledDatabaseUrl(raw: string) {
  const url = new URL(raw);
  url.searchParams.set("connection_limit", "5");
  url.searchParams.set("pool_timeout", "20");
  if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
  return url.toString();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const raw = process.env.DATABASE_URL;
  return new PrismaClient(
    raw ? { datasources: { db: { url: pooledDatabaseUrl(raw) } } } : undefined,
  );
}

export const prisma = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = prisma;
