import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/context";
import { PrintButton } from "./print-button";

const SCENARIO: Record<string, string> = {
  NONE: "TEMELFATURA",
  EARSIV: "EARSIVFATURA",
  EFATURA: "TICARIFATURA",
};
const DOC_LABEL: Record<string, string> = {
  NONE: "FATURA",
  EARSIV: "e-Arşiv Fatura",
  EFATURA: "e-Fatura",
};

const tl = (n: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + "TL";

const TZ = "Europe/Istanbul";
function fmtDateParts(d: Date) {
  const p = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("day")} - ${get("month")} - ${get("year")}`;
}
function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(d);
}

interface AddrParty {
  address?: string | null;
  neighborhood?: string | null;
  district?: string | null;
  city?: string | null;
}
function addressLines(p: AddrParty): string[] {
  const lines: string[] = [];
  if (p.address) lines.push(p.address);
  if (p.neighborhood) lines.push(p.neighborhood);
  const dc = [p.district, p.city].filter(Boolean).join("/");
  if (dc) lines.push(dc);
  return lines;
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();

  const invoice = await ctx.db.invoice.findFirst({
    where: { id },
    include: {
      company: true,
      contact: true,
      lines: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  const seller = invoice.company;
  const buyer = invoice.contact;
  const profile = invoice.einvoiceProfile;

  // KDV oranına göre grupla (matrah + hesaplanan KDV)
  const groups = new Map<number, { net: number; tax: number }>();
  let grossTotal = 0;
  for (const l of invoice.lines) {
    const rate = Number(l.taxRate);
    const g = groups.get(rate) ?? { net: 0, tax: 0 };
    g.net += Number(l.netAmount);
    g.tax += Number(l.taxAmount);
    groups.set(rate, g);
    grossTotal += Number(l.quantity) * Number(l.unitPrice);
  }
  const rateGroups = [...groups.entries()].sort((a, b) => b[0] - a[0]);
  const discountTotal = Number(invoice.discountTotal);
  const netTotal = Number(invoice.netTotal);
  const grand = Number(invoice.grandTotal);

  return (
    <div className="invoice-sheet mx-auto max-w-[820px] bg-white p-10 text-[13px] text-slate-900">
      <style>{`
        @media print { .no-print { display: none !important; } @page { size: A4; margin: 14mm; } }
        .meta-row td { padding: 2px 0; vertical-align: top; }
      `}</style>

      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>

      {/* Üst blok: Satıcı (sol) + belge etiketi & meta (sağ) */}
      <div className="flex items-start justify-between gap-8 border-b border-slate-300 pb-4">
        <div className="max-w-[52%] leading-tight">
          <div className="text-[15px] font-bold uppercase">{seller.name}</div>
          {addressLines(seller).map((l, i) => <div key={i}>{l}</div>)}
          {seller.phone && <div>Tel:{seller.phone}</div>}
          {seller.email && <div>e-Posta:{seller.email}</div>}
          {seller.taxOffice && <div>Vergi Dairesi:{seller.taxOffice}</div>}
          <div>VKN:{seller.taxNumber ?? "-"}</div>
        </div>
        <div className="text-right">
          <div className="mb-2 inline-block rounded border border-slate-400 px-4 py-1 text-[15px] font-semibold">
            {DOC_LABEL[profile]}
          </div>
          <table className="meta-row ml-auto text-left text-[12px]">
            <tbody>
              <tr><td className="pr-4 font-semibold">Tarih:</td><td>{fmtDateParts(invoice.issueDate)}</td></tr>
              <tr><td className="pr-4 font-semibold">Fatura No:</td><td>{invoice.invoiceNumber}</td></tr>
              <tr><td className="pr-4 font-semibold">Özelleştirme No:</td><td>TR1.2</td></tr>
              <tr><td className="pr-4 font-semibold">Senaryo:</td><td>{SCENARIO[profile]}</td></tr>
              <tr><td className="pr-4 font-semibold">Fatura Tipi:</td><td>{invoice.type === "SALES" ? "SATIS" : "ALIS"}</td></tr>
              <tr><td className="pr-4 font-semibold">Oluşma Zamanı:</td><td>{fmtTime(invoice.issueDate)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SAYIN / Alıcı bloğu */}
      <div className="border-b border-slate-300 py-4 leading-tight">
        <div className="text-[12px] font-semibold text-slate-500">SAYIN</div>
        <div className="text-[14px] font-bold">{buyer.name}</div>
        {addressLines(buyer).map((l, i) => <div key={i}>{l}</div>)}
        {buyer.taxOffice && <div>Vergi Dairesi:{buyer.taxOffice}</div>}
        {buyer.taxNumber ? <div>VKN:{buyer.taxNumber}</div> : buyer.tckn ? <div>TCKN:{buyer.tckn}</div> : null}
        {invoice.ettn && <div className="mt-1 font-mono text-[11px]">ETTN:{invoice.ettn}</div>}
      </div>

      {/* Kalem tablosu */}
      <table className="mt-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b-2 border-slate-400 text-left">
            <th className="py-1 pr-2">Sıra No</th>
            <th className="py-1 pr-2">Mal Hizmet</th>
            <th className="py-1 pr-2 text-right">Miktar</th>
            <th className="py-1 pr-2 text-right">Birim Fiyat</th>
            <th className="py-1 pr-2 text-right">Mal Hizmet Tutarı</th>
            {discountTotal > 0 && <th className="py-1 pr-2 text-right">İskonto</th>}
            <th className="py-1 pr-2 text-right">KDV Oranı</th>
            <th className="py-1 text-right">KDV Tutarı</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l, i) => {
            const gross = Number(l.quantity) * Number(l.unitPrice);
            return (
              <tr key={l.id} className="border-b border-slate-200 align-top">
                <td className="py-1 pr-2">{i + 1}</td>
                <td className="py-1 pr-2">{l.description || l.product?.name || "Kalem"}</td>
                <td className="py-1 pr-2 text-right whitespace-nowrap">{Number(l.quantity)} {l.unit}</td>
                <td className="py-1 pr-2 text-right">{tl(Number(l.unitPrice))}</td>
                <td className="py-1 pr-2 text-right">{tl(gross)}</td>
                {discountTotal > 0 && <td className="py-1 pr-2 text-right">{tl(Number(l.discountAmount))}</td>}
                <td className="py-1 pr-2 text-right">%{Number(l.taxRate).toFixed(2)}</td>
                <td className="py-1 text-right">{tl(Number(l.taxAmount))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Toplamlar */}
      <div className="mt-6 flex justify-end">
        <table className="text-[12px]">
          <tbody>
            <tr><td className="pr-8 py-0.5 text-left">Mal Hizmet Toplam Tutarı:</td><td className="text-right">{tl(grossTotal)}</td></tr>
            {discountTotal > 0 && (
              <tr><td className="pr-8 py-0.5 text-left">Toplam İskonto:</td><td className="text-right">{tl(discountTotal)}</td></tr>
            )}
            {rateGroups.map(([rate, g]) => (
              <tr key={`m${rate}`}><td className="pr-8 py-0.5 text-left">KDV Matrahı(%{rate.toFixed(0)}):</td><td className="text-right">{tl(g.net)}</td></tr>
            ))}
            <tr><td className="pr-8 py-0.5 text-left">Vergi Hariç Tutar:</td><td className="text-right">{tl(netTotal)}</td></tr>
            {rateGroups.map(([rate, g]) => (
              <tr key={`k${rate}`}><td className="pr-8 py-0.5 text-left">Hesaplanan KDV(%{rate.toFixed(0)}):</td><td className="text-right">{tl(g.tax)}</td></tr>
            ))}
            <tr><td className="pr-8 py-0.5 text-left">Vergiler Dahil Toplam Tutar:</td><td className="text-right">{tl(grand)}</td></tr>
            <tr className="text-[14px] font-bold"><td className="pr-8 py-1 text-left">Ödenecek Tutar:</td><td className="text-right">{tl(grand)}</td></tr>
          </tbody>
        </table>
      </div>

      {invoice.note ? <p className="mt-6 text-[12px] text-slate-600">Not: {invoice.note}</p> : null}

      {/* Alt not */}
      <div className="mt-8 space-y-0.5 text-[11px] text-slate-600">
        <div>*Gönderim Şekli:{invoice.dispatchType}</div>
        <div>*Sicil No: {seller.tradeRegistryNo ?? ""}, İşletme Merkezi: {seller.businessCenter ?? seller.city ?? ""}</div>
        {seller.iban && <div>*IBAN: {seller.iban}</div>}
        {profile === "EARSIV" && <div>e-Arşiv izni kapsamında elektronik ortamda iletilmiştir.</div>}
      </div>
    </div>
  );
}
