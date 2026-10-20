"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import {
  CHANNEL_TR,
  PAYMENT_PROGRESS_TR,
  REGISTRATION_TR,
  fmtMoney,
} from "@/lib/format";

export type StudentListRow = {
  id: string;
  fullName: string;
  classroom: string | null;
  parentPhone: string | null;
  registrationStatus: "NEW" | "RENEWED" | "NOT_RENEWED";
  academicYear: string;
  fee: number;
  collected: number;
  remaining: number;
  paymentChannel: string | null;
  sourcePaymentPlan: string | null;
  progress: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
};

const registrationColor = { NEW: "blue", RENEWED: "green", NOT_RENEWED: "amber" } as const;
const progressColor = { NOT_STARTED: "gray", IN_PROGRESS: "blue", COMPLETED: "green" } as const;

export function StudentsTable({
  rows,
  activeYear,
}: {
  rows: StudentListRow[];
  activeYear: string;
}) {
  const [q, setQ] = useState("");
  const [classroom, setClassroom] = useState("");
  const [registration, setRegistration] = useState("");
  const [progress, setProgress] = useState("");

  const classrooms = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.classroom?.trim()) set.add(r.classroom.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (classroom && (r.classroom ?? "") !== classroom) return false;
      if (registration && r.registrationStatus !== registration) return false;
      if (progress && r.progress !== progress) return false;
      if (!needle) return true;
      const hay = [r.fullName, r.classroom ?? "", r.parentPhone ?? "", r.academicYear]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return hay.includes(needle);
    });
  }, [rows, q, classroom, registration, progress]);

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[14rem] flex-1">
          <label className="label" htmlFor="student-search">Ara</label>
          <input
            id="student-search"
            className="input"
            placeholder="Ad, sınıf, telefon…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="w-40">
          <label className="label" htmlFor="student-class">Sınıf</label>
          <select
            id="student-class"
            className="input"
            value={classroom}
            onChange={(e) => setClassroom(e.target.value)}
          >
            <option value="">Tümü</option>
            {classrooms.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="label" htmlFor="student-reg">Kayıt durumu</label>
          <select
            id="student-reg"
            className="input"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="NEW">{REGISTRATION_TR.NEW}</option>
            <option value="RENEWED">{REGISTRATION_TR.RENEWED}</option>
            <option value="NOT_RENEWED">{REGISTRATION_TR.NOT_RENEWED}</option>
          </select>
        </div>
        <div className="w-44">
          <label className="label" htmlFor="student-progress">Ödeme durumu</label>
          <select
            id="student-progress"
            className="input"
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="NOT_STARTED">{PAYMENT_PROGRESS_TR.NOT_STARTED}</option>
            <option value="IN_PROGRESS">{PAYMENT_PROGRESS_TR.IN_PROGRESS}</option>
            <option value="COMPLETED">{PAYMENT_PROGRESS_TR.COMPLETED}</option>
          </select>
        </div>
        <p className="pb-2 text-sm text-ink-500">
          {activeYear} · {filtered.length} / {rows.length} öğrenci
        </p>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full">
          <thead className="border-b border-ink-100 bg-ink-50/80">
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
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="td font-medium">{s.fullName}</td>
                <td className="td">{s.classroom ?? "-"}</td>
                <td className="td">{s.academicYear}</td>
                <td className="td text-right">{fmtMoney(s.fee)}</td>
                <td className="td text-right">{fmtMoney(s.collected)}</td>
                <td className="td text-right">{fmtMoney(s.remaining)}</td>
                <td className="td">
                  {s.paymentChannel ? CHANNEL_TR[s.paymentChannel] ?? s.paymentChannel : "-"}
                  {s.sourcePaymentPlan ? (
                    <span className="block max-w-[14rem] truncate text-xs text-slate-400">
                      {s.sourcePaymentPlan}
                    </span>
                  ) : null}
                </td>
                <td className="td">
                  <Badge color={progressColor[s.progress]}>{PAYMENT_PROGRESS_TR[s.progress]}</Badge>
                </td>
                <td className="td">
                  <Badge color={registrationColor[s.registrationStatus]}>
                    {REGISTRATION_TR[s.registrationStatus]}
                  </Badge>
                </td>
                <td className="td text-right">
                  <Link
                    href={`/students/${s.id}`}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Detay
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={10}>
                  {rows.length === 0
                    ? "Aktif yılda kayıtlı öğrenci yok. Okuldan çek ile listeyi alın."
                    : "Filtreye uyan öğrenci yok."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
