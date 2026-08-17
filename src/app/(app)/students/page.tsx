import Link from "next/link";
import { requireAuth, canManageOperations } from "@/lib/context";
import { createStudentAction } from "@/app/actions/students";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { EnrollmentForm } from "./enrollment-form";

export default async function StudentsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const [students, banks] = await Promise.all([
    ctx.db.student.findMany({
      orderBy: { fullName: "asc" },
      include: { enrollments: { orderBy: { enrolledAt: "desc" }, take: 1 } },
    }),
    ctx.db.cardBankSetting.findMany({ where: { active: true }, orderBy: { bankName: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Öğrenciler / Kayıtlar"
        description="Yıllık kayıt ücreti ve ödeme planı."
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
      <div className="overflow-hidden card">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Öğrenci</th>
              <th className="th">Sınıf</th>
              <th className="th">Son kayıt</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="td font-medium">{s.fullName}</td>
                <td className="td">{s.classroom ?? "-"}</td>
                <td className="td">{s.enrollments[0]?.academicYear ?? "-"}</td>
                <td className="td text-right">
                  <Link href={`/students/${s.id}`} className="text-xs font-medium text-brand-600 hover:underline">Detay</Link>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={4}>Henüz öğrenci yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
