import "./ensure-db-url";
import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const TENANT_UNSCOPED_MODELS = new Set<string>(["User"]);

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
