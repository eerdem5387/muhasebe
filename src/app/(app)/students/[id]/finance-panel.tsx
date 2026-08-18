"use client";

import { ActionForm, MiniForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { Badge } from "@/components/ui";
import {
  CHANNEL_TR,
  PAYMENT_PROGRESS_TR,
  REGISTRATION_TR,
  fmtDate,
  fmtMoney,
  todayISO,
} from "@/lib/format";
import {
  createPlannedPaymentAction,
  deletePlannedPaymentAction,
  deleteStudentCollectionAction,
  recordStudentPaymentAction,
  updateExpectedChannelAction,
  setPaymentProgressAction,
} from "@/app/actions/student-payments";

type Line = {
  id: string;
  installmentIndex: number;
  amount: number;
  releaseDate: string;
  status: "BLOCKED" | "EXPECTED" | "REALIZED";
  plannedChannel: string | null;
};

type CollectionRow = {
  id: string;
  amount: number;
  collectedAt: string;
  paymentChannel: string;
  notes: string | null;
  attachments: { id: string; filename: string }[];
};

type EnrollmentView = {
  id: string;
  academicYear: string;
  annualFee: number;
  announcedFee: number | null;
  paymentChannel: string;
  sourcePaymentPlan: string | null;
  contractNo: string | null;
  paymentProgress: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  enrolledAt: string;
  scheduleLines: Line[];
  collections: CollectionRow[];
};

const progressColor = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
} as const;

const registrationColor = {
  NEW: "blue",
  RENEWED: "green",
  NOT_RENEWED: "amber",
} as const;

function ChannelFields({ name, id, defaultValue }: { name: string; id?: string; defaultValue?: string }) {
  return (
    <select id={id ?? name} name={name} className="input" defaultValue={defaultValue ?? "EFT"} required>
      <option value="EFT">EFT / Havale</option>
      <option value="CREDIT_CARD">Kredi kartı</option>
      <option value="CHECK">Çek</option>
      <option value="CASH">Nakit</option>
    </select>
  );
}

export function StudentFinancePanel({
  studentId,
  registrationStatus,
  canWrite,
  enrollment,
}: {
  studentId: string;
  registrationStatus: "NEW" | "RENEWED" | "NOT_RENEWED";
  canWrite: boolean;
  enrollment: EnrollmentView | null;
}) {
  if (!enrollment) {
    return (
      <div className="card p-8 text-sm text-slate-500">
        Bu öğrenci için henüz yıllık kayıt ücreti yok. Kayıt durumu: {REGISTRATION_TR[registrationStatus]}.
      </div>
    );
  }

  const collected = enrollment.collections.reduce((sum, c) => sum + c.amount, 0);
  const remaining = Math.max(0, enrollment.annualFee - collected);
  const pct = enrollment.annualFee > 0 ? Math.min(100, Math.round((collected / enrollment.annualFee) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Kayıt ücreti" value={fmtMoney(enrollment.annualFee)} hint={enrollment.academicYear} />
        <SummaryCard label="Alınan" value={fmtMoney(collected)} hint={`%${pct} tahsil edildi`} />
        <SummaryCard label="Kalan" value={fmtMoney(remaining)} hint={remaining <= 0 ? "Borç kalmadı" : "Tahsil edilecek"} />
        <SummaryCard label="Alınacak yöntem" value={CHANNEL_TR[enrollment.paymentChannel] ?? enrollment.paymentChannel} hint={enrollment.sourcePaymentPlan || "Sözleşme planı yok"} />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kayıt durumu</p>
            <div className="mt-1">
              <Badge color={registrationColor[registrationStatus]}>{REGISTRATION_TR[registrationStatus]}</Badge>
            </div>
            {enrollment.contractNo ? <p className="mt-2 text-xs text-slate-400">Sözleşme no: {enrollment.contractNo}</p> : null}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Ödeme durumu</p>
            {canWrite ? (
              <div className="flex flex-wrap gap-2">
                {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const).map((value) => (
                  <MiniForm key={value} action={setPaymentProgressAction}>
                    <input type="hidden" name="enrollmentId" value={enrollment.id} />
                    <input type="hidden" name="studentId" value={studentId} />
                    <input type="hidden" name="paymentProgress" value={value} />
                    <button
                      type="submit"
                      className={enrollment.paymentProgress === value ? "btn-primary !py-1.5 text-xs" : "btn-secondary !py-1.5 text-xs"}
                    >
                      {PAYMENT_PROGRESS_TR[value]}
                    </button>
                  </MiniForm>
                ))}
              </div>
            ) : (
              <Badge color={progressColor[enrollment.paymentProgress]}>{PAYMENT_PROGRESS_TR[enrollment.paymentProgress]}</Badge>
            )}
          </div>
        </div>

        {canWrite && (
          <ActionForm action={updateExpectedChannelAction} submitLabel="Yöntemi kaydet" className="max-w-md space-y-3">
            <input type="hidden" name="enrollmentId" value={enrollment.id} />
            <input type="hidden" name="studentId" value={studentId} />
            <div>
              <label className="label" htmlFor="expectedChannel">Kalan tutarın alınacağı yöntem</label>
              <ChannelFields name="paymentChannel" id="expectedChannel" defaultValue={enrollment.paymentChannel} />
            </div>
          </ActionForm>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Ödeme planı</h2>
            <p className="text-sm text-slate-500">Alınan, devam eden ve ileri tarihli planlanan ödemeler.</p>
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <FormModal buttonLabel="Ödeme al" title="Ödeme kaydet">
                <ActionForm action={recordStudentPaymentAction} submitLabel="Kaydet">
                  <input type="hidden" name="enrollmentId" value={enrollment.id} />
                  <input type="hidden" name="studentId" value={studentId} />
                  <div>
                    <label className="label" htmlFor="amount">Tutar</label>
                    <input id="amount" name="amount" className="input" required defaultValue={remaining > 0 ? String(remaining) : ""} />
                  </div>
                  <div>
                    <label className="label" htmlFor="collectedAt">Tarih</label>
                    <input id="collectedAt" name="collectedAt" type="date" className="input" defaultValue={todayISO()} required />
                  </div>
                  <div>
                    <label className="label" htmlFor="collectChannel">Yöntem</label>
                    <ChannelFields name="paymentChannel" id="collectChannel" defaultValue={enrollment.paymentChannel} />
                  </div>
                  <div>
                    <label className="label" htmlFor="file">Belge (opsiyonel)</label>
                    <input id="file" name="file" type="file" accept="image/*,.pdf" className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="notes">Not</label>
                    <input id="notes" name="notes" className="input" />
                  </div>
                </ActionForm>
              </FormModal>
              <FormModal buttonLabel="İleri tarih planla" title="İleri tarihli ödeme" buttonClassName="btn-secondary">
                <ActionForm action={createPlannedPaymentAction} submitLabel="Planla">
                  <input type="hidden" name="enrollmentId" value={enrollment.id} />
                  <input type="hidden" name="studentId" value={studentId} />
                  <div>
                    <label className="label" htmlFor="planAmount">Tutar</label>
                    <input id="planAmount" name="amount" className="input" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="dueAt">Alınacağı tarih</label>
                    <input id="dueAt" name="dueAt" type="date" className="input" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="planChannel">Yöntem</label>
                    <ChannelFields name="paymentChannel" id="planChannel" defaultValue={enrollment.paymentChannel} />
                  </div>
                </ActionForm>
              </FormModal>
            </div>
          )}
        </div>
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">#</th>
              <th className="th">Tarih</th>
              <th className="th text-right">Tutar</th>
              <th className="th">Yöntem</th>
              <th className="th">Durum</th>
              {canWrite && <th className="th"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrollment.scheduleLines.map((line) => {
              const future = new Date(line.releaseDate).getTime() > Date.now();
              const label = line.status === "REALIZED" ? "Alındı" : future ? "Planlandı" : "Bekliyor";
              const color = line.status === "REALIZED" ? "green" : future ? "blue" : "amber";
              return (
                <tr key={line.id}>
                  <td className="td">{line.installmentIndex}</td>
                  <td className="td">{fmtDate(line.releaseDate)}</td>
                  <td className="td text-right">{fmtMoney(line.amount)}</td>
                  <td className="td">{line.plannedChannel ? CHANNEL_TR[line.plannedChannel] : CHANNEL_TR[enrollment.paymentChannel]}</td>
                  <td className="td"><Badge color={color}>{label}</Badge></td>
                  {canWrite && (
                    <td className="td text-right">
                      {line.status !== "REALIZED" && (
                        <MiniForm action={deletePlannedPaymentAction}>
                          <input type="hidden" name="id" value={line.id} />
                          <input type="hidden" name="studentId" value={studentId} />
                          <button className="text-xs text-red-600">Sil</button>
                        </MiniForm>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {enrollment.scheduleLines.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={canWrite ? 6 : 5}>Henüz plan satırı yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Alınan ödemeler</h2>
          <p className="text-sm text-slate-500">Gerçekleşen tahsilatlar ve belgeler.</p>
        </div>
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th text-right">Tutar</th>
              <th className="th">Yöntem</th>
              <th className="th">Belge</th>
              {canWrite && <th className="th"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrollment.collections.map((c) => (
              <tr key={c.id}>
                <td className="td">{fmtDate(c.collectedAt)}</td>
                <td className="td text-right">{fmtMoney(c.amount)}</td>
                <td className="td">{CHANNEL_TR[c.paymentChannel]}</td>
                <td className="td">
                  {c.attachments.length === 0
                    ? <span className="text-slate-400">—</span>
                    : c.attachments.map((a) => (
                      <a key={a.id} href={`/api/attachments/${a.id}`} className="mr-2 text-brand-600 underline" target="_blank">{a.filename}</a>
                    ))}
                  {c.notes ? <span className="block text-xs text-slate-400">{c.notes}</span> : null}
                </td>
                {canWrite && (
                  <td className="td text-right">
                    <MiniForm action={deleteStudentCollectionAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="studentId" value={studentId} />
                      <button className="text-xs text-red-600">Sil</button>
                    </MiniForm>
                  </td>
                )}
              </tr>
            ))}
            {enrollment.collections.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={canWrite ? 5 : 4}>Henüz ödeme alınmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
