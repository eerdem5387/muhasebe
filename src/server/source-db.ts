import { PrismaClient } from "@prisma/client";

/** Read-only connection to the school operations database. Never used for writes. */
export function getSourceDb(): PrismaClient {
  const url = process.env.SOURCE_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("SOURCE_DATABASE_URL tanımlı değil. Okul veritabanı bağlantısını ekleyin.");
  }
  return new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });
}

export type SourceStudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  motherPhone: string | null;
  fatherPhone: string | null;
  updatedAt: Date;
};

export type SourceContractRow = {
  id: string;
  studentId: string;
  kind: "NEW_REGISTRATION" | "RENEWAL";
  createdAt: Date;
  updatedAt: Date;
  academicYear: string | null;
  studentClass: string | null;
  studentTuitionFee: string | null;
  announcedTuitionFee: string | null;
  studentTotal: string | null;
  paymentPlan: string | null;
  registrationDate: string | null;
  contractDate: string | null;
  contractNo: string | null;
};

export async function fetchSourceStudents(source: PrismaClient): Promise<SourceStudentRow[]> {
  return source.$queryRawUnsafe<SourceStudentRow[]>(`
    SELECT id, "firstName", "lastName", grade, "motherPhone", "fatherPhone", "updatedAt"
    FROM students
    ORDER BY "lastName" ASC, "firstName" ASC
  `);
}

export async function fetchSourceContracts(source: PrismaClient): Promise<SourceContractRow[]> {
  return source.$queryRawUnsafe<SourceContractRow[]>(`
    SELECT
      id,
      "studentId",
      kind,
      "createdAt",
      "updatedAt",
      NULLIF("contractData"->>'academicYear', '') AS "academicYear",
      NULLIF("contractData"->>'studentClass', '') AS "studentClass",
      NULLIF("contractData"->>'studentTuitionFee', '') AS "studentTuitionFee",
      NULLIF("contractData"->>'announcedTuitionFee', '') AS "announcedTuitionFee",
      NULLIF("contractData"->>'studentTotal', '') AS "studentTotal",
      NULLIF("contractData"->>'paymentPlan', '') AS "paymentPlan",
      NULLIF("contractData"->>'registrationDate', '') AS "registrationDate",
      NULLIF("contractData"->>'contractDate', '') AS "contractDate",
      NULLIF("contractData"->>'contractNo', '') AS "contractNo"
    FROM (
      SELECT id, "studentId", "contractData", "createdAt", "updatedAt", 'NEW_REGISTRATION' AS kind
      FROM new_registrations
      UNION ALL
      SELECT id, "studentId", "contractData", "createdAt", "updatedAt", 'RENEWAL' AS kind
      FROM renewals
    ) contracts
    ORDER BY "updatedAt" DESC
  `);
}

export async function fetchSourceActiveYear(source: PrismaClient): Promise<string | null> {
  const rows = await source.$queryRawUnsafe<Array<{ name: string }>>(`
    SELECT name FROM academic_years WHERE "isActive" = true ORDER BY "updatedAt" DESC LIMIT 1
  `);
  return rows[0]?.name ?? null;
}
