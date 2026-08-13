import type { AccountType } from "@prisma/client";

/**
 * Well-known account codes (Turkish Uniform Chart of Accounts - Tek Düzen Hesap
 * Planı) that the accounting engine and intercompany service resolve by code.
 */
export const ACCOUNT_CODES = {
  CASH: "100", // Kasa
  BANK: "102", // Bankalar
  RECEIVABLE: "120", // Alıcılar
  GROUP_RECEIVABLE: "133", // Grup Şirketlerinden Alacaklar (ilişkili taraf)
  INVENTORY: "153", // Ticari Mallar (alış gideri)
  DEDUCTIBLE_VAT: "191", // İndirilecek KDV
  PAYABLE: "320", // Satıcılar
  GROUP_PAYABLE: "336", // Grup Şirketlerine Borçlar (ilişkili taraf)
  OUTPUT_VAT: "391", // Hesaplanan KDV
  SALES_REVENUE: "600", // Yurtiçi Satışlar
  GENERAL_EXPENSE: "770", // Genel Yönetim Giderleri
} as const;

export interface ChartAccount {
  code: string;
  name: string;
  type: AccountType;
}

/** Default chart of accounts provisioned for every new company. */
export const DEFAULT_CHART_OF_ACCOUNTS: ChartAccount[] = [
  { code: ACCOUNT_CODES.CASH, name: "Kasa", type: "ASSET" },
  { code: ACCOUNT_CODES.BANK, name: "Bankalar", type: "ASSET" },
  { code: ACCOUNT_CODES.RECEIVABLE, name: "Alıcılar", type: "ASSET" },
  { code: ACCOUNT_CODES.GROUP_RECEIVABLE, name: "Grup Şirketlerinden Alacaklar", type: "ASSET" },
  { code: ACCOUNT_CODES.INVENTORY, name: "Ticari Mallar", type: "ASSET" },
  { code: ACCOUNT_CODES.DEDUCTIBLE_VAT, name: "İndirilecek KDV", type: "ASSET" },
  { code: ACCOUNT_CODES.PAYABLE, name: "Satıcılar", type: "LIABILITY" },
  { code: ACCOUNT_CODES.GROUP_PAYABLE, name: "Grup Şirketlerine Borçlar", type: "LIABILITY" },
  { code: ACCOUNT_CODES.OUTPUT_VAT, name: "Hesaplanan KDV", type: "LIABILITY" },
  { code: ACCOUNT_CODES.SALES_REVENUE, name: "Yurtiçi Satışlar", type: "REVENUE" },
  { code: ACCOUNT_CODES.GENERAL_EXPENSE, name: "Genel Yönetim Giderleri", type: "EXPENSE" },
];
