import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/context";
import { buildXlsx, xlsxResponse, XlsxColumn } from "@/server/export/xlsx";
import {
  getAging,
  getBalanceSheet,
  getContactStatement,
  getIncomeStatement,
  getTrialBalance,
  getVatSummary,
} from "@/server/accounting/reports";
import { fmtDate } from "@/lib/format";

const TYPE_TR: Record<string, string> = {
  CUSTOMER: "Müşteri", VENDOR: "Tedarikçi", LEAD: "Aday",
  SALES: "Satış", PURCHASE: "Alış", PRODUCT: "Ürün", SERVICE: "Hizmet",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const { resource } = await params;
  const url = new URL(req.url);
  const stamp = new Date().toISOString().slice(0, 10);
  const companyId = ctx.companyId;

  const requireCompany = () => {
    if (!companyId) throw new Error("no-company");
    return companyId;
  };

  try {
    switch (resource) {
      case "contacts": {
        const rows = await ctx.db.contact.findMany({ orderBy: { name: "asc" } });
        const cols: XlsxColumn[] = [
          { header: "Ünvan", key: "name", width: 30 },
          { header: "Tür", key: "type" },
          { header: "E-posta", key: "email", width: 26 },
          { header: "Telefon", key: "phone" },
          { header: "VKN", key: "taxNumber" },
          { header: "CRM Aşama", key: "crmStage" },
        ];
        return xlsxResponse(
          await buildXlsx("Cariler", cols, rows.map((r) => ({
            name: r.name, type: TYPE_TR[r.type] ?? r.type, email: r.email ?? "",
            phone: r.phone ?? "", taxNumber: r.taxNumber ?? "", crmStage: r.crmStage,
          }))),
          `cariler-${stamp}.xlsx`,
        );
      }
      case "products": {
        const rows = await ctx.db.product.findMany({ orderBy: { name: "asc" } });
        const cols: XlsxColumn[] = [
          { header: "Ad", key: "name", width: 30 },
          { header: "Tür", key: "type" },
          { header: "Birim", key: "unit" },
          { header: "Fiyat", key: "price", money: true },
        ];
        return xlsxResponse(
          await buildXlsx("Ürünler", cols, rows.map((r) => ({
            name: r.name, type: TYPE_TR[r.type] ?? r.type, unit: r.unit, price: Number(r.defaultPrice),
          }))),
          `urunler-${stamp}.xlsx`,
        );
      }
      case "taxes": {
        const rows = await ctx.db.tax.findMany({ orderBy: { rate: "desc" } });
        const cols: XlsxColumn[] = [
          { header: "Ad", key: "name", width: 26 },
          { header: "Oran (%)", key: "rate", money: true },
        ];
        return xlsxResponse(
          await buildXlsx("Vergiler", cols, rows.map((r) => ({ name: r.name, rate: Number(r.rate) }))),
          `vergiler-${stamp}.xlsx`,
        );
      }
      case "accounts": {
        const cid = requireCompany();
        const rows = await ctx.db.account.findMany({ where: { companyId: cid }, orderBy: { code: "asc" } });
        const cols: XlsxColumn[] = [
          { header: "Kod", key: "code" },
          { header: "Ad", key: "name", width: 34 },
          { header: "Tür", key: "type" },
        ];
        return xlsxResponse(
          await buildXlsx("Hesap Planı", cols, rows.map((r) => ({ code: r.code, name: r.name, type: r.type }))),
          `hesap-plani-${stamp}.xlsx`,
        );
      }
      case "invoices": {
        const cid = requireCompany();
        const rows = await ctx.db.invoice.findMany({
          where: { companyId: cid },
          orderBy: [{ issueDate: "desc" }],
          include: { contact: { select: { name: true } } },
        });
        const cols: XlsxColumn[] = [
          { header: "Tür", key: "type" },
          { header: "Durum", key: "status" },
          { header: "Fatura No", key: "no", width: 20 },
          { header: "Cari", key: "contact", width: 30 },
          { header: "Tarih", key: "date" },
          { header: "Net", key: "net", money: true },
          { header: "KDV", key: "tax", money: true },
          { header: "Genel Toplam", key: "grand", money: true },
        ];
        return xlsxResponse(
          await buildXlsx("Faturalar", cols, rows.map((r) => ({
            type: TYPE_TR[r.type] ?? r.type, status: r.status, no: r.invoiceNumber,
            contact: r.contact.name, date: fmtDate(r.issueDate),
            net: Number(r.netTotal), tax: Number(r.taxTotal), grand: Number(r.grandTotal),
          }))),
          `faturalar-${stamp}.xlsx`,
        );
      }
      case "journal": {
        const cid = requireCompany();
        const entries = await ctx.db.ledgerEntry.findMany({
          where: { companyId: cid },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          include: { lines: { include: { account: { select: { code: true, name: true } }, contact: { select: { name: true } } } } },
        });
        const cols: XlsxColumn[] = [
          { header: "Tarih", key: "date" },
          { header: "Tür", key: "doc" },
          { header: "Açıklama", key: "desc", width: 36 },
          { header: "Hesap Kodu", key: "code" },
          { header: "Hesap", key: "account", width: 28 },
          { header: "Cari", key: "contact", width: 24 },
          { header: "Borç", key: "debit", money: true },
          { header: "Alacak", key: "credit", money: true },
        ];
        const flat = entries.flatMap((e) =>
          e.lines.map((l) => ({
            date: fmtDate(e.date), doc: e.documentType, desc: e.description ?? "",
            code: l.account.code, account: l.account.name, contact: l.contact?.name ?? "",
            debit: Number(l.debit), credit: Number(l.credit),
          })),
        );
        return xlsxResponse(await buildXlsx("Yevmiye", cols, flat), `yevmiye-${stamp}.xlsx`);
      }
      case "transfers": {
        const rows = await ctx.db.intercompanyTransfer.findMany({ orderBy: [{ date: "desc" }] });
        const companies = await ctx.db.company.findMany({ select: { id: true, name: true } });
        const nameOf = new Map(companies.map((c) => [c.id, c.name]));
        const cols: XlsxColumn[] = [
          { header: "Tarih", key: "date" },
          { header: "Gönderen", key: "from", width: 26 },
          { header: "Alan", key: "to", width: 26 },
          { header: "Tutar", key: "amount", money: true },
          { header: "Açıklama", key: "desc", width: 30 },
        ];
        return xlsxResponse(
          await buildXlsx("Transferler", cols, rows.map((r) => ({
            date: fmtDate(r.date), from: nameOf.get(r.fromCompanyId) ?? "", to: nameOf.get(r.toCompanyId) ?? "",
            amount: Number(r.amount), desc: r.description ?? "",
          }))),
          `transferler-${stamp}.xlsx`,
        );
      }
      case "trial-balance": {
        const cid = requireCompany();
        const tb = await getTrialBalance(ctx.db, cid);
        const cols: XlsxColumn[] = [
          { header: "Kod", key: "code" },
          { header: "Hesap", key: "name", width: 34 },
          { header: "Borç", key: "debit", money: true },
          { header: "Alacak", key: "credit", money: true },
          { header: "Bakiye", key: "balance", money: true },
        ];
        return xlsxResponse(
          await buildXlsx("Mizan", cols, tb.rows.map((r) => ({
            code: r.code, name: r.name, debit: Number(r.debit), credit: Number(r.credit), balance: Number(r.balance),
          }))),
          `mizan-${stamp}.xlsx`,
        );
      }
      case "statement": {
        const cid = requireCompany();
        const contactId = url.searchParams.get("contactId");
        if (!contactId) return new Response("contactId gerekli", { status: 400 });
        const st = await getContactStatement(ctx.db, cid, contactId);
        const cols: XlsxColumn[] = [
          { header: "Tarih", key: "date" },
          { header: "Açıklama", key: "desc", width: 36 },
          { header: "Hesap", key: "account", width: 24 },
          { header: "Borç", key: "debit", money: true },
          { header: "Alacak", key: "credit", money: true },
          { header: "Bakiye", key: "balance", money: true },
        ];
        return xlsxResponse(
          await buildXlsx("Cari Ekstre", cols, st.rows.map((r) => ({
            date: fmtDate(r.date), desc: r.description ?? "", account: `${r.accountCode} ${r.accountName}`,
            debit: Number(r.debit), credit: Number(r.credit), balance: Number(r.balance),
          }))),
          `cari-ekstre-${stamp}.xlsx`,
        );
      }
      case "vat": {
        const cid = requireCompany();
        const range = {
          from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
          to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
        };
        const vat = await getVatSummary(ctx.db, cid, range);
        const cols: XlsxColumn[] = [
          { header: "Kalem", key: "k", width: 30 },
          { header: "Tutar", key: "v", money: true },
        ];
        return xlsxResponse(
          await buildXlsx("KDV Beyanı", cols, [
            { k: "Hesaplanan KDV (391)", v: Number(vat.outputVat) },
            { k: "İndirilecek KDV (191)", v: Number(vat.deductibleVat) },
            { k: Number(vat.payable) >= 0 ? "Ödenecek KDV" : "Devreden KDV", v: Math.abs(Number(vat.payable)) },
          ]),
          `kdv-beyani-${stamp}.xlsx`,
        );
      }
      case "income-statement": {
        const cid = requireCompany();
        const range = {
          from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
          to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
        };
        const rep = await getIncomeStatement(ctx.db, cid, range);
        const cols: XlsxColumn[] = [
          { header: "Grup", key: "g" },
          { header: "Kod", key: "code" },
          { header: "Hesap", key: "name", width: 34 },
          { header: "Tutar", key: "amount", money: true },
        ];
        const rows = [
          ...rep.revenues.map((r) => ({ g: "Gelir", code: r.code, name: r.name, amount: Number(r.amount) })),
          { g: "Gelir", code: "", name: "TOPLAM GELİR", amount: Number(rep.totalRevenue) },
          ...rep.expenses.map((r) => ({ g: "Gider", code: r.code, name: r.name, amount: Number(r.amount) })),
          { g: "Gider", code: "", name: "TOPLAM GİDER", amount: Number(rep.totalExpense) },
          { g: "Sonuç", code: "", name: "DÖNEM NET KÂR/ZARAR", amount: Number(rep.netProfit) },
        ];
        return xlsxResponse(await buildXlsx("Gelir Tablosu", cols, rows), `gelir-tablosu-${stamp}.xlsx`);
      }
      case "balance-sheet": {
        const cid = requireCompany();
        const bs = await getBalanceSheet(ctx.db, cid);
        const cols: XlsxColumn[] = [
          { header: "Grup", key: "g" },
          { header: "Kod", key: "code" },
          { header: "Hesap", key: "name", width: 34 },
          { header: "Tutar", key: "amount", money: true },
        ];
        const rows = [
          ...bs.assets.map((r) => ({ g: "Aktif", code: r.code, name: r.name, amount: Number(r.amount) })),
          { g: "Aktif", code: "", name: "TOPLAM AKTİF", amount: Number(bs.totalAssets) },
          ...bs.liabilities.map((r) => ({ g: "Pasif", code: r.code, name: r.name, amount: Number(r.amount) })),
          { g: "Pasif", code: "", name: "TOPLAM PASİF", amount: Number(bs.totalLiabilities) },
          ...bs.equity.map((r) => ({ g: "Özkaynak", code: r.code, name: r.name, amount: Number(r.amount) })),
          { g: "Özkaynak", code: "", name: "TOPLAM ÖZKAYNAK", amount: Number(bs.totalEquity) },
        ];
        return xlsxResponse(await buildXlsx("Bilanço", cols, rows), `bilanco-${stamp}.xlsx`);
      }
      case "aging-receivable":
      case "aging-payable": {
        const cid = requireCompany();
        const kind = resource === "aging-payable" ? "PAYABLE" : "RECEIVABLE";
        const rows = await getAging(ctx.db, cid, kind);
        const cols: XlsxColumn[] = [
          { header: "Cari", key: "name", width: 30 },
          { header: "0-30 gün", key: "b0", money: true },
          { header: "31-60 gün", key: "b1", money: true },
          { header: "61-90 gün", key: "b2", money: true },
          { header: "90+ gün", key: "b3", money: true },
          { header: "Toplam", key: "t", money: true },
        ];
        return xlsxResponse(
          await buildXlsx("Yaşlandırma", cols, rows.map((r) => ({
            name: r.contactName, b0: r.b0_30, b1: r.b31_60, b2: r.b61_90, b3: r.b90plus, t: r.total,
          }))),
          `yaslandirma-${kind === "PAYABLE" ? "borc" : "alacak"}-${stamp}.xlsx`,
        );
      }
      default:
        return new Response("Bilinmeyen kaynak", { status: 404 });
    }
  } catch (err) {
    if (err instanceof Error && err.message === "no-company") {
      return new Response("Önce bir şirket seçin", { status: 400 });
    }
    return new Response("Export hatası", { status: 500 });
  }
}
