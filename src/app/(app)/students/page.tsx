import { requireAuth, canManageOperations, canManageStudentRecords } from "@/lib/context";
import { createStudentAction } from "@/app/actions/students";
import { runSchoolSyncAction } from "@/app/actions/sync";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { resolveActiveAcademicYear } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { resolvePaymentProgress } from "@/server/payment-progress";
import { EnrollmentForm } from "./enrollment-form";
import { StudentsTable, type StudentListRow } from "./students-table";

export const maxDuration = 60;

export default async function StudentsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const canStudents = canManageStudentRecords(ctx.role, ctx.isSuperAdmin);

  const yearRows = await ctx.db.enrollment.findMany({
    distinct: ["academicYear"],
    select: { academicYear: true },
  });
  const activeYear = resolveActiveAcademicYear(yearRows.map((r) => r.academicYear));

  const [students, banks, lastSync] = await Promise.all([
    ctx.db.student.findMany({
      where: {
        enrollments: { some: { academicYear: activeYear } },
      },
      orderBy: { fullName: "asc" },
      include: {
        enrollments: {
          where: { academicYear: activeYear },
          orderBy: { enrolledAt: "desc" },
          take: 1,
          include: { collections: { select: { amount: true } } },
        },
      },
    }),
    ctx.db.cardBankSetting.findMany({ where: { active: true }, orderBy: { bankName: "asc" } }),
    prisma.schoolSyncRun.findFirst({
      where: { tenantId: ctx.tenantId },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const rows: StudentListRow[] = students.map((s) => {
    const en = s.enrollments[0]!;
    const fee = Number(en.annualFee);
    const collected = en.collections.reduce((sum, c) => sum + Number(c.amount), 0);
    const remaining = Math.max(0, fee - collected);
    const progress = resolvePaymentProgress({
      fee,
      collected,
      stored: en.paymentProgress,
      manual: en.paymentProgressManual,
    });
    return {
      id: s.id,
      fullName: s.fullName,
      classroom: s.classroom,
      parentPhone: s.parentPhone,
      registrationStatus: s.registrationStatus,
      academicYear: en.academicYear,
      fee,
      collected,
      remaining,
      paymentChannel: en.paymentChannel,
      sourcePaymentPlan: en.sourcePaymentPlan,
      progress,
    };
  });

  const importedCount = students.filter((s) => s.externalId).length;

  const allStudentsForForm = canStudents
    ? await ctx.db.student.findMany({
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Öğrenciler / Kayıtlar"
        description={`Yalnızca aktif eğitim yılı (${activeYear}) kayıtları listelenir. Arama ve filtrelerle daraltabilirsiniz.`}
        actions={
          canWrite || canStudents ? (
            <>
              {canWrite ? (
                <ActionForm action={runSchoolSyncAction} submitLabel="Okuldan çek" className="!space-y-2">
                  <span className="sr-only">Okul yönetim sisteminden öğrencileri çek</span>
                </ActionForm>
              ) : null}
              {canStudents ? (
                <>
                  <FormModal buttonLabel="Öğrenci ekle" title="Yeni öğrenci">
                    <ActionForm action={createStudentAction} submitLabel="Öğrenci ekle">
                      <div>
                        <label className="label" htmlFor="fullName">Ad soyad</label>
                        <input id="fullName" name="fullName" className="input" required />
                      </div>
                      <div>
                        <label className="label" htmlFor="classroom">Sınıf</label>
                        <input id="classroom" name="classroom" className="input" />
                      </div>
                      <div>
                        <label className="label" htmlFor="parentPhone">Veli telefon</label>
                        <input id="parentPhone" name="parentPhone" className="input" />
                      </div>
                    </ActionForm>
                  </FormModal>
                  <FormModal buttonLabel="Yıllık kayıt" title="Yeni yıllık kayıt" size="lg" buttonClassName="btn-secondary">
                    <EnrollmentForm
                      students={allStudentsForForm}
                      banks={banks.map((b) => ({ id: b.id, bankName: b.bankName, blockDays: b.blockDays }))}
                    />
                  </FormModal>
                </>
              ) : null}
            </>
          ) : undefined
        }
      />
      {importedCount === 0 && canWrite && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Listede henüz {activeYear} okul kaydı yok. Sağ üstteki <strong>Okuldan çek</strong> ile öğrencileri alın.
          {lastSync && !lastSync.ok ? (
            <span className="mt-1 block text-red-700">{lastSync.error}</span>
          ) : null}
        </div>
      )}
      <StudentsTable rows={rows} activeYear={activeYear} />
    </div>
  );
}
