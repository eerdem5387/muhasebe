import { z } from "zod";

const opt = z.string().trim().optional().or(z.literal(""));
const decimalString = z
  .string()
  .trim()
  .refine((v) => v !== "" && !Number.isNaN(Number(v.replace(",", "."))), {
    message: "Geçerli bir sayı girin.",
  })
  .transform((v) => v.replace(",", "."));

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifre gerekli."),
});

export const schoolAdminSchema = z.object({
  schoolName: z.string().trim().min(2, "Okul / şirket adı gerekli."),
  name: z.string().trim().min(2, "Yönetici adı gerekli."),
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
});

export const userSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad gerekli."),
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
  role: z.enum(["ADMIN", "ACCOUNTANT", "PRINCIPAL", "FOUNDER"]),
});

export const categorySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  name: z.string().trim().min(2, "Kalem adı gerekli."),
});

export const cardBankSchema = z.object({
  bankName: z.string().trim().min(2, "Banka adı gerekli."),
  blockDays: z.coerce.number().int().min(0).max(365),
});

export const studentSchema = z.object({
  fullName: z.string().trim().min(2, "Öğrenci adı gerekli."),
  classroom: opt,
  parentPhone: opt,
  notes: opt,
});

export const enrollmentSchema = z.object({
  studentId: z.string().trim().min(1, "Öğrenci seçin."),
  academicYear: z.string().trim().min(4, "Eğitim yılı gerekli."),
  annualFee: decimalString,
  paymentChannel: z.enum(["EFT", "CREDIT_CARD", "CHECK", "CASH"]),
  installmentCount: z.coerce.number().int().min(1).max(24).default(1),
  cardBankId: opt,
  enrolledAt: z.string().trim().min(1, "Kayıt tarihi gerekli."),
  notes: opt,
});

export const collectionSchema = z.object({
  enrollmentId: z.string().trim().min(1, "Kayıt seçin."),
  amount: decimalString,
  collectedAt: z.string().trim().min(1, "Tarih gerekli."),
  paymentChannel: z.enum(["EFT", "CREDIT_CARD", "CHECK", "CASH"]),
  notes: opt,
});

export const incomePlanCategorySchema = z.object({
  name: z.string().trim().min(2, "Kalem adı gerekli."),
  requiresStudent: z
    .union([z.literal("true"), z.literal("false"), z.literal("on"), z.literal("")])
    .optional()
    .transform((v) => v === "true" || v === "on"),
});

export const incomePlanChannelSchema = z.enum([
  "EFT",
  "CREDIT_CARD",
  "CHECK",
  "CASH",
  "ECOM_ZIRAAT",
  "ECOM_ZIRAAT_2X",
  "ECOM_OTHER_BANKS",
]);

export const incomePlanSchema = z.object({
  categoryId: z.string().trim().min(1, "Gelir kalemi seçin."),
  enrollmentId: opt,
  amount: decimalString,
  planDate: z.string().trim().min(1, "Tarih gerekli."),
  paymentChannel: incomePlanChannelSchema,
  installmentCount: z.coerce.number().int().min(1).max(48).default(1),
  blockDays: z.coerce.number().int().min(0).max(365).default(0),
  bankName: opt,
  notes: opt,
});

export const requestChannelSchema = z.enum(["BANK", "CHECK", "CREDIT_CARD", "CASH", "PROMISSORY"]);

export const expenseSchema = z.object({
  categoryId: z.string().trim().min(1, "Gider kalemi seçin."),
  amount: decimalString,
  spentAt: z.string().trim().min(1, "Tarih gerekli."),
  channel: requestChannelSchema.optional().or(z.literal("")),
  notes: opt,
  requestId: opt,
});

export const expenseRequestSchema = z.object({
  title: z.string().trim().min(3, "Harcama kalemi gerekli."),
  requesterName: z.string().trim().min(2, "Talep eden adı gerekli."),
  channel: requestChannelSchema,
  notes: opt,
});

export const completeExpenseRequestSchema = z.object({
  id: z.string().trim().min(1),
  amount: decimalString,
  occurredAt: z.string().trim().min(1, "Harcama tarihi gerekli."),
});

export const reportEntrySchema = z.object({
  side: z.enum(["INCOME", "EXPENSE"]),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  groupId: opt,
  groupName: opt,
  itemId: opt,
  itemName: opt,
  amount: decimalString,
  occurredAt: z.string().trim().min(1, "Tarih gerekli."),
  payKind: z.enum(["CASH", "CARD"]).default("CASH"),
  notes: opt,
});

const identityNo = z
  .string()
  .trim()
  .regex(/^\d{10,11}$/, "TC kimlik 11, vergi no 10 haneli olmalıdır.");

export const cashbookChannelSchema = z.enum(["BANK", "CHECK", "CREDIT_CARD", "CASH", "PROMISSORY"]);

const cashbookPaymentLineSchema = z
  .object({
    channel: cashbookChannelSchema,
    bankName: opt,
    checkInstallments: opt,
    amount: decimalString,
    occurredAt: z.string().trim().min(1, "Tarih gerekli."),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "CHECK") {
      const n = Number(data.checkInstallments);
      if (!data.checkInstallments || Number.isNaN(n) || n < 1 || n > 48) {
        ctx.addIssue({
          code: "custom",
          path: ["checkInstallments"],
          message: "Çek için vade sayısı (1–48) girin.",
        });
      }
      if (!data.bankName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["bankName"],
          message: "Çek için banka adı gerekli.",
        });
      }
    }
    if (data.channel === "CREDIT_CARD" && !data.bankName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["bankName"],
        message: "Kredi kartı için banka adı gerekli.",
      });
    }
  });

export const cashbookIncomeSchema = z
  .object({
    yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    incomeCategory: z.enum(["STUDENT", "TRIP", "FOOD", "OTHER"]),
    studentId: opt,
    payerFirstName: opt,
    payerLastName: opt,
    paymentsJson: z.string().trim().min(2, "En az bir ödeme satırı gerekli."),
    notes: opt,
  })
  .superRefine((data, ctx) => {
    if (data.incomeCategory === "STUDENT") {
      if (!data.studentId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["studentId"], message: "Öğrenci seçin." });
      }
    } else {
      if (!data.payerFirstName?.trim() || data.payerFirstName.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["payerFirstName"], message: "Ad gerekli." });
      }
      if (!data.payerLastName?.trim() || data.payerLastName.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["payerLastName"], message: "Soyad gerekli." });
      }
    }

    let payments: unknown;
    try {
      payments = JSON.parse(data.paymentsJson);
    } catch {
      ctx.addIssue({ code: "custom", path: ["paymentsJson"], message: "Ödeme satırları geçersiz." });
      return;
    }
    if (!Array.isArray(payments) || payments.length === 0) {
      ctx.addIssue({ code: "custom", path: ["paymentsJson"], message: "En az bir ödeme satırı ekleyin." });
      return;
    }
    for (let i = 0; i < payments.length; i++) {
      const line = cashbookPaymentLineSchema.safeParse(payments[i]);
      if (!line.success) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentsJson"],
          message: `Ödeme #${i + 1}: ${line.error.issues[0]?.message ?? "geçersiz"}`,
        });
      }
    }
  });

export const cashbookExpenseSchema = z
  .object({
    yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    expenseTitle: z.string().trim().min(2, "Harcama yapılan adı gerekli."),
    payeeIdentityNo: identityNo,
    channel: cashbookChannelSchema,
    bankName: opt,
    checkInstallments: opt,
    amount: decimalString,
    occurredAt: z.string().trim().min(1, "Tarih gerekli."),
    invoiceNo: z.string().trim().min(1, "Fatura no gerekli."),
    notes: opt,
  })
  .superRefine((data, ctx) => {
    if (data.channel === "CHECK") {
      const n = Number(data.checkInstallments);
      if (!data.checkInstallments || Number.isNaN(n) || n < 1 || n > 48) {
        ctx.addIssue({
          code: "custom",
          path: ["checkInstallments"],
          message: "Çek için vade sayısı (1–48) girin.",
        });
      }
      if (!data.bankName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["bankName"],
          message: "Çek için banka adı gerekli.",
        });
      }
    }
    if (data.channel === "CREDIT_CARD" && !data.bankName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["bankName"],
        message: "Kredi kartı için banka adı gerekli.",
      });
    }
  });
