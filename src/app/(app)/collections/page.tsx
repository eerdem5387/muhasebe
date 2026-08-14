import { requireAuth, canManageOperations } from "@/lib/context";
import { createCollectionAction } from "@/app/actions/collections";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { CHANNEL_TR, fmtDate, fmtMoney, todayISO } from "@/lib/format";

export default async function CollectionsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const [collections, enrollments] = await Promise.all([
    ctx.db.collection.findMany({
      orderBy: { collectedAt: "desc" },
      include: {
        attachments: { select: { id: true, filename: true, kind: true } },
        enrollment: { include: { student: { select: { fullName: true } } } },
      },
    }),
    ctx.db.enrollment.findMany({
      where: { status: "ACTIVE" },
      include: { student: { select: { fullName: true } } },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Tahsilatlar" description="Ödeme belgesi (slip / çek fotoğrafı / makbuz) zorunludur." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 overflow-hidden card">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Tarih</th>
                <th className="th">Öğrenci</th>
                <th className="th">Kanal</th>
                <th className="th text-right">Tutar</th>
                <th className="th">Belge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.map((c) => (
                <tr key={c.id}>
                  <td className="td">{fmtDate(c.collectedAt)}</td>
                  <td className="td">{c.enrollment.student.fullName}</td>
                  <td className="td">{CHANNEL_TR[c.paymentChannel]}</td>
                  <td className="td text-right">{fmtMoney(Number(c.amount))}</td>
                  <td className="td">
                    {c.attachments.map((a) => (
                      <a key={a.id} href={`/api/attachments/${a.id}`} className="text-brand-600 underline" target="_blank">{a.filename}</a>
                    ))}
                  </td>
                </tr>
              ))}
              {collections.length === 0 && (
                <tr><td className="td text-slate-400" colSpan={5}>Henüz tahsilat yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {canWrite && (
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-800">Yeni tahsilat</h2>
            <ActionForm action={createCollectionAction} submitLabel="Kaydet">
              <div>
                <label className="label" htmlFor="enrollmentId">Kayıt</label>
                <select id="enrollmentId" name="enrollmentId" className="input" required>
                  <option value="">Seçin…</option>
                  {enrollments.map((e) => (
                    <option key={e.id} value={e.id}>{e.student.fullName} · {e.academicYear}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="amount">Tutar</label>
                <input id="amount" name="amount" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="collectedAt">Tarih</label>
                <input id="collectedAt" name="collectedAt" type="date" className="input" defaultValue={todayISO()} required />
              </div>
              <div>
                <label className="label" htmlFor="paymentChannel">Kanal</label>
                <select id="paymentChannel" name="paymentChannel" className="input" defaultValue="EFT">
                  <option value="EFT">EFT / Havale (makbuz)</option>
                  <option value="CREDIT_CARD">Kredi kartı (slip)</option>
                  <option value="CHECK">Çek (fotoğraf)</option>
                  <option value="CASH">Nakit (makbuz)</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="file">Belge</label>
                <input id="file" name="file" type="file" accept="image/*,.pdf" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="notes">Not</label>
                <input id="notes" name="notes" className="input" />
              </div>
            </ActionForm>
          </div>
        )}
      </div>
    </div>
  );
}
