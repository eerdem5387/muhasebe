import Link from "next/link";
import { requireAuth, canManageOperations } from "@/lib/context";
import { createStudentAction } from "@/app/actions/students";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { EnrollmentForm } from "./enrollment-form";

export default async function StudentsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role);
  const [students, banks] = await Promise.all([
    ctx.db.student.findMany({
      orderBy: { fullName: "asc" },
      include: { enrollments: { orderBy: { enrolledAt: "desc" }, take: 1 } },
    }),
    ctx.db.cardBankSetting.findMany({ where: { active: true }, orderBy: { bankName: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Öğrenciler / Kayıtlar" description="Yıllık kayıt ücreti ve ödeme planı." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 overflow-hidden card">
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
        {canWrite && (
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">Yeni öğrenci</h2>
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
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">Yeni yıllık kayıt</h2>
              <EnrollmentForm
                students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
                banks={banks.map((b) => ({ id: b.id, bankName: b.bankName, blockDays: b.blockDays }))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
