import "./ensure-db-url";
import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Base Prisma client. Do NOT use this directly for tenant-scoped data access in
 * request handlers -- use `getTenantDb(tenantId)` so that the tenant isolation
 * guard is always applied. The base client is only for auth (User) lookups,
 * tenant provisioning and low-level maintenance.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Every model in the schema carries a `tenantId` column except `User`
 * (accounts are global and mapped to tenants through `TenantUser`).
 */
const TENANT_UNSCOPED_MODELS = new Set<string>(["User"]);

/**
 * Operations for which we can safely inject a `tenantId` filter into `where`.
 * We deliberately avoid `findUnique`/`update`/`delete`/`upsert` because Prisma
 * rejects non-unique fields in their `where`. The service layer uses
 * `findFirst` + `updateMany`/`deleteMany` instead so isolation is always
 * enforced.
 */
const WHERE_INJECT_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

export type TenantDb = ReturnType<typeof getTenantDb>;

/**
 * Returns a Prisma client extension that transparently scopes every query to a
 * single tenant. This is the application-level half of the defense-in-depth
 * isolation strategy (the other half being Postgres RLS policies).
 */
export function getTenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error("getTenantDb requires a tenantId");
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (TENANT_UNSCOPED_MODELS.has(model)) {
            return query(args);
          }

          const typedArgs = (args ?? {}) as Record<string, unknown>;

          if (WHERE_INJECT_OPS.has(operation)) {
            typedArgs.where = {
              ...(typedArgs.where as Record<string, unknown> | undefined),
              tenantId,
            };
          }

          if (operation === "create") {
            typedArgs.data = {
              ...(typedArgs.data as Record<string, unknown> | undefined),
              tenantId,
            };
          }

          if (operation === "createMany" || operation === "createManyAndReturn") {
            const data = typedArgs.data;
            if (Array.isArray(data)) {
              typedArgs.data = data.map((row) => ({
                ...(row as Record<string, unknown>),
                tenantId,
              }));
            } else if (data && typeof data === "object") {
              typedArgs.data = { ...(data as Record<string, unknown>), tenantId };
            }
          }

          return query(typedArgs);
        },
      },
    },
  });
}

export { Prisma };
