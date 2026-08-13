import { z } from "zod";

const decimalString = z
  .string()
  .trim()
  .refine((v) => v !== "" && !Number.isNaN(Number(v.replace(",", "."))), {
    message: "Geçerli bir sayı girin.",
  })
  .transform((v) => v.replace(",", "."));

export const registerSchema = z
  .object({
    tenantName: z.string().trim().min(2, "En az 2 karakter."),
    companyName: z.string().trim().min(2, "En az 2 karakter."),
    email: z.string().trim().email("Geçerli bir e-posta girin."),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
  })
  .strip();

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifre gerekli."),
});

const opt = z.string().trim().optional().or(z.literal(""));

export const companySchema = z.object({
  name: z.string().trim().min(2, "Şirket adı gerekli."),
  taxNumber: opt,
  taxOffice: opt,
  address: opt,
  neighborhood: opt,
  district: opt,
  city: opt,
  country: opt,
  postalCode: opt,
  phone: opt,
  email: z.string().trim().email("Geçerli bir e-posta girin.").optional().or(z.literal("")),
  iban: opt,
  tradeRegistryNo: opt,
  mersisNo: opt,
  businessCenter: opt,
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Cari adı gerekli."),
  type: z.enum(["CUSTOMER", "VENDOR", "LEAD"]),
  email: z.string().trim().email("Geçerli bir e-posta girin.").optional().or(z.literal("")),
  phone: opt,
  taxNumber: opt,
  tckn: opt,
  taxOffice: opt,
  address: opt,
  neighborhood: opt,
  district: opt,
  city: opt,
  country: opt,
  postalCode: opt,
  crmStage: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"]).default("NEW"),
});

export const activitySchema = z.object({
  contactId: z.string().trim().min(1),
  type: z.enum(["NOTE", "CALL", "MEETING", "EMAIL", "TASK"]).default("NOTE"),
  subject: z.string().trim().min(1, "Konu gerekli."),
  notes: z.string().trim().optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı gerekli."),
  type: z.enum(["PRODUCT", "SERVICE"]).default("PRODUCT"),
  unit: z.string().trim().min(1).default("adet"),
  defaultPrice: decimalString,
});

export const taxSchema = z.object({
  name: z.string().trim().min(1, "Vergi adı gerekli."),
  rate: decimalString,
});

export const accountSchema = z.object({
  code: z.string().trim().min(1, "Hesap kodu gerekli."),
  name: z.string().trim().min(2, "Hesap adı gerekli."),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
});

export const invoiceLineSchema = z.object({
  productId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  unit: z.string().trim().optional().or(z.literal("")),
  quantity: decimalString,
  unitPrice: decimalString,
  discountRate: z.string().trim().optional().or(z.literal("")),
  taxId: z.string().trim().optional().or(z.literal("")),
});

export const invoiceSchema = z.object({
  type: z.enum(["SALES", "PURCHASE"]),
  contactId: z.string().trim().min(1, "Cari seçin."),
  einvoiceProfile: z.enum(["NONE", "EARSIV", "EFATURA"]).default("NONE"),
  dispatchType: z.enum(["ELEKTRONIK", "KAGIT"]).default("ELEKTRONIK"),
  invoiceNumber: z.string().trim().min(1, "Fatura no gerekli."),
  issueDate: z.string().trim().min(1, "Tarih gerekli."),
  issueTime: z.string().trim().optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  priceMode: z.enum(["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE"),
  lines: z.array(invoiceLineSchema).min(1, "En az bir kalem ekleyin."),
});

export const transferSchema = z.object({
  fromCompanyId: z.string().trim().min(1),
  toCompanyId: z.string().trim().min(1),
  fromAccountId: z.string().trim().min(1),
  toAccountId: z.string().trim().min(1),
  amount: decimalString,
  date: z.string().trim().min(1, "Tarih gerekli."),
  description: z.string().trim().optional().or(z.literal("")),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
