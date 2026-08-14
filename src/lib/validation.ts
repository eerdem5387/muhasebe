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

export const expenseSchema = z.object({
  categoryId: z.string().trim().min(1, "Gider kalemi seçin."),
  amount: decimalString,
  spentAt: z.string().trim().min(1, "Tarih gerekli."),
  channel: z.enum(["CREDIT_CARD", "TRANSFER"]).optional().or(z.literal("")),
  notes: opt,
  requestId: opt,
});

export const expenseRequestSchema = z.object({
  title: z.string().trim().min(3, "Talep adı gerekli."),
  quantity: decimalString,
  unitPrice: decimalString,
  requesterName: z.string().trim().min(2, "Talep eden adı gerekli."),
  channel: z.enum(["CREDIT_CARD", "TRANSFER"]),
  notes: opt,
});
