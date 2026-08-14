import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, STATUS_TR, fmtDate, fmtMoney, fmtMonth } from "@/lib/format";

const statusColor = { BLOCKED: "amber", EXPECTED: "blue", REALIZED: "green" } as const;

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  const student = await ctx.db.student.findFirst({
    where: { id },
    include: {
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: {
          cardBank: true,
          scheduleLines: { orderBy: { installmentIndex: "asc" } },
          collections: { include: { attachments: { select: { id: true, filename: true } } } },
        },
      },
    },
  });
  if (!student) notFound();

  return (
    <div>
      <PageHeader
        title={student.fullName}
        description={[student.classroom, student.parentPhone].filter(Boolean).join(" · ") || "Öğrenci kaydı"}
        actions={<Link href="/students" className="btn-secondary">Listeye dön</Link>}
      />
      <div className="space-y-6">
        {student.enrollments.map((en) => (
          <div key={en.id} className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-800">{en.academicYear} kayıt ücreti</h2>
                <p className="text-sm text-slate-500">
                  {CHANNEL_TR[en.paymentChannel]}
                  {en.cardBank ? ` · ${en.cardBank.bankName} (${en.installmentCount} taksit, ${en.cardBank.blockDays} gün bloke)` : ""}
                  {" · "}{fmtDate(en.enrolledAt)}
                </p>
              </div>
              <p className="text-lg font-semibold">{fmtMoney(Number(en.annualFee))}</p>
            </div>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Taksit</th>
                  <th className="th">Ay</th>
                  <th className="th">Serbest kalma</th>
                  <th className="th text-right">Tutar</th>
                  <th className="th">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {en.scheduleLines.map((l) => (
                  <tr key={l.id}>
                    <td className="td">{l.installmentIndex}</td>
                    <td className="td">{fmtMonth(l.yearMonth)}</td>
                    <td className="td">{fmtDate(l.releaseDate)}</td>
                    <td className="td text-right">{fmtMoney(Number(l.amount))}</td>
                    <td className="td">
                      <Badge color={statusColor[l.status]}>{STATUS_TR[l.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-sm text-slate-600">
              Tahsilat: {en.collections.length === 0 ? "henüz belge yok" : en.collections.map((c) => (
                <span key={c.id} className="mr-3">
                  {fmtMoney(Number(c.amount))} ({fmtDate(c.collectedAt)})
                  {c.attachments.map((a) => (
                    <a key={a.id} href={`/api/attachments/${a.id}`} className="ml-1 text-brand-600 underline" target="_blank">{a.filename}</a>
                  ))}
                </span>
              ))}
            </div>
          </div>
        ))}
        {student.enrollments.length === 0 && <p className="text-sm text-slate-500">Henüz yıllık kayıt yok.</p>}
      </div>
    </div>
  );
}
