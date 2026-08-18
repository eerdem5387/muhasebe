import Link from "next/link";
import { requireAuth, canManageOperations } from "@/lib/context";
import { createStudentAction } from "@/app/actions/students";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, fmtMoney } from "@/lib/format";
import { EnrollmentForm } from "./enrollment-form";

function paymentStatus(fee: number, collected: number): { label: string; color: "green" | "amber" | "blue" | "gray" } {
  if (fee <= 0) return { label: "Kayıt yok", color: "gray" };
  if (collected <= 0) return { label: "Bekliyor", color: "amber" };
  if (collected + 0.009 >= fee) return { label: "Ödendi", color: "green" };
  return { label: "Kısmi", color: "blue" };
}

export default async function StudentsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const [students, banks] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader
        title="Öğrenciler / Kayıtlar"
        description="Kayıt ücreti okul sisteminden gelir. Ödemenin alınıp alınmadığı burada takip edilir."
        actions={
          canWrite ? (
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
                  students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
                  banks={banks.map((b) => ({ id: b.id, bankName: b.bankName, blockDays: b.blockDays }))}
                />
              </FormModal>
            </>
          ) : undefined
        }
      />
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
              const status = paymentStatus(fee, collected);
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
                      <span className="block text-xs text-slate-400">{en.sourcePaymentPlan}</span>
                    ) : null}
                  </td>
                  <td className="td"><Badge color={status.color}>{status.label}</Badge></td>
                  <td className="td text-right">
                    <Link href={`/students/${s.id}`} className="text-xs font-medium text-brand-600 hover:underline">Detay</Link>
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={9}>Henüz öğrenci yok. Ayarlar’dan okul kaydını çekin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
