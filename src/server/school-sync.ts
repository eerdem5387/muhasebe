import { PaymentChannel, Prisma, type RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildIncomeSchedule, scheduleStatus } from "@/server/income-schedule";
import {
  fetchSourceActiveYear,
  fetchSourceContracts,
  fetchSourceStudents,
  getSourceDb,
  type SourceContractRow,
} from "@/server/source-db";

export type SchoolSyncResult = {
  ok: boolean;
  studentsUpserted: number;
  enrollmentsUpserted: number;
  error?: string;
};

const BANK_HINTS: Array<{ match: RegExp; name: string }> = [
  { match: /z[iİı]raat/i, name: "Ziraat Bankası" },
  { match: /akbank/i, name: "Akbank" },
  { match: /i[sş]bank|iş bank/i, name: "İş Bankası" },
  { match: /yap[iı]kredi|yapı kredi/i, name: "Yapı Kredi" },
  { match: /bonus/i, name: "Bonus" },
];

export function parseMoney(raw: string | null | undefined): Prisma.Decimal | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\s/g, "").replace("₺", "").replace("TL", "");
  if (!trimmed) return null;

  let normalized = trimmed;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(trimmed)) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) {
    normalized = trimmed.replace(/,/g, "");
  } else {
    normalized = trimmed.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = new Prisma.Decimal(normalized);
  if (value.lte(0)) return null;
  return value;
}

export function normalizeAcademicYear(raw: string | null | undefined, fallback: string): string {
  const m = raw?.match(/(20\d{2})\s*[-–]\s*(20\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  const trimmed = raw?.trim();
  return trimmed || fallback;
}

export function inferPayment(plan: string | null | undefined): {
  channel: PaymentChannel;
  installmentCount: number;
  bankName: string | null;
} {
  const text = (plan ?? "").trim();
  const upper = text.toLocaleUpperCase("tr-TR");

  let channel: PaymentChannel = "EFT";
  if (/KRED[İI]\s*KART|OTS|BONUS/.test(upper)) channel = "CREDIT_CARD";
  else if (/ÇEK|\bCEK\b/.test(upper)) channel = "CHECK";
  else if (/NAK[İI]T/.test(upper)) channel = "CASH";
  else if (/EFT|HAVALE/.test(upper)) channel = "EFT";

  const plus = text.match(/(\d+)\s*\+\s*(\d+)/);
  const single = text.match(/(\d+)\s*TAKS[İI]T/i);
  let installmentCount = 1;
  if (plus) installmentCount = Number(plus[1]) + Number(plus[2]);
  else if (single) installmentCount = Number(single[1]);
  if (!Number.isFinite(installmentCount) || installmentCount < 1) installmentCount = 1;
  if (channel !== "CREDIT_CARD") installmentCount = 1;

  const bankName = BANK_HINTS.find((b) => b.match.test(text))?.name ?? null;
  return { channel, installmentCount, bankName };
}

function pickPhone(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function parseDate(raw: string | null | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  const iso = raw.length === 10 ? `${raw}T12:00:00` : raw;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function latestContracts(rows: SourceContractRow[], fallbackYear: string): SourceContractRow[] {
  const map = new Map<string, SourceContractRow>();
  for (const row of rows) {
    const year = normalizeAcademicYear(row.academicYear, fallbackYear);
    const key = `${row.studentId}::${year}`;
    const current = map.get(key);
    if (!current || row.updatedAt > current.updatedAt) {
      map.set(key, { ...row, academicYear: year });
    }
  }
  return [...map.values()];
}

async function rebuildSchedule(input: {
  tenantId: string;
  enrollmentId: string;
  annualFee: Prisma.Decimal;
  installmentCount: number;
  enrolledAt: Date;
  blockDays: number;
}) {
  const drafts = buildIncomeSchedule({
    annualFee: input.annualFee,
    installmentCount: input.installmentCount,
    paymentDate: input.enrolledAt,
    blockDays: input.blockDays,
  });
  await prisma.incomeScheduleLine.deleteMany({ where: { enrollmentId: input.enrollmentId, tenantId: input.tenantId } });
  await prisma.incomeScheduleLine.createMany({
    data: drafts.map((line) => ({
      tenantId: input.tenantId,
      enrollmentId: input.enrollmentId,
      installmentIndex: line.installmentIndex,
      amount: line.amount,
      releaseDate: line.releaseDate,
      yearMonth: line.yearMonth,
      status: scheduleStatus(line.releaseDate, false),
    })),
  });
}

export async function runSchoolSync(tenantId?: string): Promise<SchoolSyncResult> {
  const tenant =
    (tenantId
      ? await prisma.tenant.findUnique({ where: { id: tenantId } })
      : await prisma.tenant.findFirst({
          where: process.env.SCHOOL_SYNC_TENANT_ID
            ? { id: process.env.SCHOOL_SYNC_TENANT_ID }
            : undefined,
          orderBy: { createdAt: "asc" },
        })) ?? (await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!tenant) {
    return { ok: false, studentsUpserted: 0, enrollmentsUpserted: 0, error: "Senkronize edilecek okul bulunamadı." };
  }
  const targetTenantId = tenant.id;

  const run = await prisma.schoolSyncRun.create({ data: { tenantId: targetTenantId } });
  const source = getSourceDb();
  let studentsUpserted = 0;
  let enrollmentsUpserted = 0;

  try {
    const [students, contracts, activeYearName] = await Promise.all([
      fetchSourceStudents(source),
      fetchSourceContracts(source),
      fetchSourceActiveYear(source),
    ]);
    const fallbackYear = normalizeAcademicYear(activeYearName, `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
    const allChosen = latestContracts(contracts, fallbackYear);
    const chosen = allChosen.filter(
      (c) => normalizeAcademicYear(c.academicYear, fallbackYear) === fallbackYear,
    );
    const now = new Date();
    const registrationBySourceId = new Map<string, RegistrationStatus>();
    for (const contract of chosen) {
      const year = normalizeAcademicYear(contract.academicYear, fallbackYear);
      if (year !== fallbackYear) continue;
      registrationBySourceId.set(contract.studentId, contract.kind === "NEW_REGISTRATION" ? "NEW" : "RENEWED");
    }

    const existingStudents = await prisma.student.findMany({
      where: { tenantId: targetTenantId, externalId: { not: null } },
      select: { id: true, externalId: true },
    });
    const studentIds = new Map(existingStudents.map((s) => [s.externalId as string, s.id]));

    const newStudents = students.filter((row) => !studentIds.has(row.id));
    if (newStudents.length > 0) {
      await prisma.student.createMany({
        data: newStudents.map((row) => ({
          tenantId: targetTenantId,
          externalId: row.id,
          fullName: `${row.firstName} ${row.lastName}`.replace(/\s+/g, " ").trim(),
          classroom: row.grade?.trim() || null,
          parentPhone: pickPhone(row.motherPhone, row.fatherPhone),
          registrationStatus: registrationBySourceId.get(row.id) ?? "NOT_RENEWED",
          syncedAt: now,
        })),
      });
      const created = await prisma.student.findMany({
        where: { tenantId: targetTenantId, externalId: { in: newStudents.map((s) => s.id) } },
        select: { id: true, externalId: true },
      });
      for (const s of created) studentIds.set(s.externalId as string, s.id);
    }

    for (const row of students) {
      const id = studentIds.get(row.id);
      if (!id) continue;
      await prisma.student.update({
        where: { id },
        data: {
          fullName: `${row.firstName} ${row.lastName}`.replace(/\s+/g, " ").trim(),
          classroom: row.grade?.trim() || null,
          parentPhone: pickPhone(row.motherPhone, row.fatherPhone),
          registrationStatus: registrationBySourceId.get(row.id) ?? "NOT_RENEWED",
          syncedAt: now,
        },
      });
      studentsUpserted += 1;
    }

    const banks = await prisma.cardBankSetting.findMany({ where: { tenantId: targetTenantId, active: true } });
    const bankIds = new Map<string, string>();
    async function bankIdFor(channel: PaymentChannel, bankName: string | null) {
      if (channel !== "CREDIT_CARD" || !bankName) return null;
      const cached = bankIds.get(bankName);
      if (cached) return cached;
      const existing = banks.find((b) => b.bankName.toLocaleLowerCase("tr-TR").includes(bankName.split(" ")[0].toLocaleLowerCase("tr-TR")));
      if (existing) {
        bankIds.set(bankName, existing.id);
        return existing.id;
      }
      const created = await prisma.cardBankSetting.create({
        data: { tenantId: targetTenantId, bankName, blockDays: 30 },
      });
      banks.push(created);
      bankIds.set(bankName, created.id);
      return created.id;
    }

    const existingEnrollments = await prisma.enrollment.findMany({
      where: { tenantId: targetTenantId },
      include: { collections: { select: { id: true } }, cardBank: true },
    });
    const byExternal = new Map(existingEnrollments.filter((e) => e.externalId).map((e) => [e.externalId as string, e]));
    const byStudentYear = new Map(existingEnrollments.map((e) => [`${e.studentId}::${e.academicYear}`, e]));

    for (const contract of chosen) {
      const studentId = studentIds.get(contract.studentId);
      if (!studentId) continue;

      const annualFee = parseMoney(contract.studentTuitionFee) ?? parseMoney(contract.studentTotal);
      if (!annualFee) continue;

      const academicYear = normalizeAcademicYear(contract.academicYear, fallbackYear);
      const enrolledAt = parseDate(contract.registrationDate ?? contract.contractDate, contract.createdAt);
      const announcedFee = parseMoney(contract.announcedTuitionFee);
      const payment = inferPayment(contract.paymentPlan);
      const cardBankId = await bankIdFor(payment.channel, payment.bankName);

      if (contract.studentClass) {
        await prisma.student.update({
          where: { id: studentId },
          data: { classroom: contract.studentClass },
        });
      }

      const existing =
        byExternal.get(contract.id) ?? byStudentYear.get(`${studentId}::${academicYear}`);

      const meta = {
        announcedFee,
        sourceKind: contract.kind,
        sourcePaymentPlan: contract.paymentPlan,
        contractNo: contract.contractNo,
        notes: contract.paymentPlan,
        enrolledAt,
        academicYear,
      };

      if (!existing) {
        const enrollment = await prisma.enrollment.create({
          data: {
            tenantId: targetTenantId,
            studentId,
            externalId: contract.id,
            annualFee,
            paymentChannel: payment.channel,
            installmentCount: payment.installmentCount,
            cardBankId,
            status: "ACTIVE",
            ...meta,
          },
        });
        const bank = banks.find((b) => b.id === cardBankId);
        await rebuildSchedule({
          tenantId: targetTenantId,
          enrollmentId: enrollment.id,
          annualFee,
          installmentCount: payment.installmentCount,
          enrolledAt,
          blockDays: payment.channel === "CREDIT_CARD" ? (bank?.blockDays ?? 0) : 0,
        });
        enrollmentsUpserted += 1;
        continue;
      }

      const hasCollections = existing.collections.length > 0;
      if (!hasCollections) {
        await prisma.enrollment.update({
          where: { id: existing.id },
          data: {
            ...meta,
            externalId: existing.externalId ?? contract.id,
            annualFee,
            paymentChannel: payment.channel,
            installmentCount: payment.installmentCount,
            cardBankId,
          },
        });
      } else {
        await prisma.enrollment.update({
          where: { id: existing.id },
          data: { ...meta, externalId: existing.externalId ?? contract.id },
        });
      }
      enrollmentsUpserted += 1;
    }

    const stale = await prisma.enrollment.findMany({
      where: {
        tenantId: targetTenantId,
        externalId: { not: null },
        NOT: { academicYear: fallbackYear },
      },
      select: { id: true },
    });
    if (stale.length > 0) {
      const staleIds = stale.map((e) => e.id);
      await prisma.collection.deleteMany({ where: { enrollmentId: { in: staleIds } } });
      await prisma.enrollment.deleteMany({ where: { id: { in: staleIds } } });
    }

    await prisma.schoolSyncRun.update({
      where: { id: run.id },
      data: {
        ok: true,
        finishedAt: new Date(),
        studentsUpserted,
        enrollmentsUpserted,
      },
    });
    return { ok: true, studentsUpserted, enrollmentsUpserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Senkronizasyon başarısız.";
    await prisma.schoolSyncRun.update({
      where: { id: run.id },
      data: { ok: false, finishedAt: new Date(), error: message, studentsUpserted, enrollmentsUpserted },
    });
    return { ok: false, studentsUpserted, enrollmentsUpserted, error: message };
  } finally {
    await source.$disconnect().catch(() => undefined);
  }
}
