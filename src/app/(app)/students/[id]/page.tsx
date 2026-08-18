import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth, canManageOperations } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { REGISTRATION_TR } from "@/lib/format";
import { resolvePaymentProgress } from "@/server/payment-progress";
import { StudentFinancePanel } from "./finance-panel";

export const maxDuration = 60;

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const student = await ctx.db.student.findFirst({
    where: { id },
    include: {
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: {
          cardBank: true,
          scheduleLines: { orderBy: { installmentIndex: "asc" } },
          collections: {
            orderBy: { collectedAt: "desc" },
            include: { attachments: { select: { id: true, filename: true } } },
          },
        },
      },
    },
  });
  if (!student) notFound();

  const enrollment = student.enrollments[0] ?? null;
  const collected = enrollment ? enrollment.collections.reduce((sum, c) => sum + Number(c.amount), 0) : 0;
  const progress = enrollment
    ? resolvePaymentProgress({
        fee: Number(enrollment.annualFee),
        collected,
        stored: enrollment.paymentProgress,
        manual: enrollment.paymentProgressManual,
      })
    : null;

  return (
    <div>
      <PageHeader
        title={student.fullName}
        description={[student.classroom, student.parentPhone, REGISTRATION_TR[student.registrationStatus]].filter(Boolean).join(" · ")}
        actions={<Link href="/students" className="btn-secondary">Listeye dön</Link>}
      />
      <StudentFinancePanel
        studentId={student.id}
        registrationStatus={student.registrationStatus}
        canWrite={canWrite}
        enrollment={enrollment ? {
          id: enrollment.id,
          academicYear: enrollment.academicYear,
          annualFee: Number(enrollment.annualFee),
          announcedFee: enrollment.announcedFee ? Number(enrollment.announcedFee) : null,
          paymentChannel: enrollment.paymentChannel,
          sourcePaymentPlan: enrollment.sourcePaymentPlan,
          contractNo: enrollment.contractNo,
          paymentProgress: progress ?? enrollment.paymentProgress,
          enrolledAt: enrollment.enrolledAt.toISOString(),
          scheduleLines: enrollment.scheduleLines.map((l) => ({
            id: l.id,
            installmentIndex: l.installmentIndex,
            amount: Number(l.amount),
            releaseDate: l.releaseDate.toISOString(),
            status: l.status,
            plannedChannel: l.plannedChannel,
          })),
          collections: enrollment.collections.map((c) => ({
            id: c.id,
            amount: Number(c.amount),
            collectedAt: c.collectedAt.toISOString(),
            paymentChannel: c.paymentChannel,
            notes: c.notes,
            attachments: c.attachments,
          })),
        } : null}
      />
    </div>
  );
}
