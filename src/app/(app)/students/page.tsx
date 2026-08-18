import Link from "next/link";
import { requireAuth, canManageOperations } from "@/lib/context";
import { createStudentAction } from "@/app/actions/students";
import { runSchoolSyncAction } from "@/app/actions/sync";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, PAYMENT_PROGRESS_TR, REGISTRATION_TR, fmtMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { resolvePaymentProgress } from "@/server/payment-progress";
import { EnrollmentForm } from "./enrollment-form";

export const maxDuration = 60;

const registrationColor = { NEW: "blue", RENEWED: "green", NOT_RENEWED: "amber" } as const;
const progressColor = { NOT_STARTED: "gray", IN_PROGRESS: "blue", COMPLETED: "green" } as const;

export default async function StudentsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const [students, banks, lastSync] = await Promise.all([
    ctx.db.student.findMany({
      orderBy: { fullName: "asc" },
      include: {
        enrollments: {
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
  const importedCount = students.filter((s) => s.externalId).length;

  return (
    <div>
      <PageHeader
        title="Öğrenciler / Kayıtlar"
        description="Kayıt durumu okul sisteminden gelir. Ödeme takibi bu ekrandan ve öğrenci detayından yapılır."
        actions={
          canWrite ? (
            <>
              <ActionForm action={runSchoolSyncAction} submitLabel="Okuldan çek" className="!space-y-2">
                <span className="sr-only">Okul yönetim sisteminden öğrencileri çek</span>
              </ActionForm>
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
                  students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
                  banks={banks.map((b) => ({ id: b.id, bankName: b.bankName, blockDays: b.blockDays }))}
                />
              </FormModal>
            </>
          ) : undefined
        }
      />
      {importedCount === 0 && canWrite && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Listede henüz okul kaydı yok. Sağ üstteki <strong>Okuldan çek</strong> ile öğrencileri alın.
          {lastSync && !lastSync.ok ? (
            <span className="mt-1 block text-red-700">{lastSync.error}</span>
          ) : null}
        </div>
      )}
      <div className="overflow-x-auto card">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Öğrenci</th>
              <th className="th">Sınıf</th>
              <th className="th">Yıl</th>
              <th className="th text-right">Ücret</th>
              <th className="th text-right">Alınan</th>
              <th className="th text-right">Kalan</th>
              <th className="th">Kanal</th>
              <th className="th">Ödeme Durumu</th>
              <th className="th">Durum</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => {
              const en = s.enrollments[0];
              const fee = en ? Number(en.annualFee) : 0;
              const collected = en ? en.collections.reduce((sum, c) => sum + Number(c.amount), 0) : 0;
              const remaining = Math.max(0, fee - collected);
              const progress = en
                ? resolvePaymentProgress({
                    fee,
                    collected,
                    stored: en.paymentProgress,
                    manual: en.paymentProgressManual,
                  })
                : "NOT_STARTED";
              return (
                <tr key={s.id}>
                  <td className="td font-medium">{s.fullName}</td>
                  <td className="td">{s.classroom ?? "-"}</td>
                  <td className="td">{en?.academicYear ?? "-"}</td>
                  <td className="td text-right">{en ? fmtMoney(fee) : "-"}</td>
                  <td className="td text-right">{en ? fmtMoney(collected) : "-"}</td>
                  <td className="td text-right">{en ? fmtMoney(remaining) : "-"}</td>
                  <td className="td">
                    {en ? CHANNEL_TR[en.paymentChannel] : "-"}
                    {en?.sourcePaymentPlan ? (
                      <span className="block max-w-[14rem] truncate text-xs text-slate-400">{en.sourcePaymentPlan}</span>
                    ) : null}
                  </td>
                  <td className="td">
                    <Badge color={progressColor[progress]}>{PAYMENT_PROGRESS_TR[progress]}</Badge>
                  </td>
                  <td className="td">
                    <Badge color={registrationColor[s.registrationStatus]}>{REGISTRATION_TR[s.registrationStatus]}</Badge>
                  </td>
                  <td className="td text-right">
                    <Link href={`/students/${s.id}`} className="text-xs font-medium text-brand-600 hover:underline">Detay</Link>
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={10}>Henüz öğrenci yok. Okuldan çek ile listeyi alın.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
