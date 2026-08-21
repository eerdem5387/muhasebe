import "./ensure-db-url";
import { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError } from "./errors";

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

/** Ops that use a unique where — must verify tenant before touching the row. */
const UNIQUE_MUTATION_OPS = new Set(["update", "delete", "upsert"]);
const UNIQUE_READ_OPS = new Set(["findUnique", "findUniqueOrThrow"]);

function modelDelegate(model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (prisma as unknown as Record<string, { findFirst: (args: unknown) => Promise<{ id: string } | null> }>)[key];
}

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

          if (UNIQUE_READ_OPS.has(operation)) {
            const where = (typedArgs.where as Record<string, unknown> | undefined) ?? {};
            const delegate = modelDelegate(model);
            const row = await delegate.findFirst({
              where: { ...where, tenantId },
              select: { id: true },
            });
            if (!row) {
              if (operation === "findUniqueOrThrow") {
                throw new NotFoundError();
              }
              return null;
            }
            typedArgs.where = { id: row.id };
          }

          if (UNIQUE_MUTATION_OPS.has(operation)) {
            const where = (typedArgs.where as Record<string, unknown> | undefined) ?? {};
            const delegate = modelDelegate(model);
            const row = await delegate.findFirst({
              where: { ...where, tenantId },
              select: { id: true },
            });
            if (!row) throw new NotFoundError();
            typedArgs.where = { id: row.id };
            if (operation === "upsert") {
              const create = (typedArgs.create as Record<string, unknown> | undefined) ?? {};
              typedArgs.create = { ...create, tenantId };
              const update = (typedArgs.update as Record<string, unknown> | undefined) ?? {};
              // never allow changing tenant via upsert update payload
              if ("tenantId" in update) delete update.tenantId;
              typedArgs.update = update;
            }
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
