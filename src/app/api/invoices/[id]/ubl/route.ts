import { getAuthContext } from "@/lib/context";
import { generateUblTr } from "@/server/einvoice/ubl";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const invoice = await ctx.db.invoice.findFirst({
    where: { id },
    include: { company: true, contact: true, lines: true },
  });
  if (!invoice) return new Response("Fatura bulunamadı", { status: 404 });

  const xml = generateUblTr(invoice);
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="fatura-${invoice.invoiceNumber}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
