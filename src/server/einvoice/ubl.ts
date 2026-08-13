import type { Company, Contact, Invoice, InvoiceLine } from "@prisma/client";

function esc(v: string | null | undefined): string {
  return (v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function d(v: Date): string {
  return v.toISOString().slice(0, 10);
}

function t(v: Date): string {
  return v.toISOString().slice(11, 19);
}

function n(v: unknown): string {
  return Number(v).toFixed(2);
}

export interface UblInvoice extends Invoice {
  lines: InvoiceLine[];
  company: Company;
  contact: Contact;
}

/**
 * Generates a UBL-TR 1.2 (GİB) uyumlu Invoice XML. Bu belge bir entegratöre
 * gönderilmeye hazırdır; canlı GİB gönderimi entegratör API'si ile yapılır.
 */
export function generateUblTr(inv: UblInvoice): string {
  const profile = inv.einvoiceProfile === "EARSIV" ? "EARSIVFATURA" : "TICARIFATURA";
  const typeCode = inv.type === "SALES" ? "SATIS" : "IADE";
  const uuid = inv.ettn ?? "00000000-0000-0000-0000-000000000000";
  const currency = "TRY";

  const c = inv.company;
  const ct = inv.contact;
  const companyParty = {
    name: c.name, vkn: c.taxNumber, tckn: null as string | null, office: c.taxOffice,
    address: c.address, neighborhood: c.neighborhood, district: c.district,
    city: c.city, postalCode: c.postalCode, country: c.country ?? "Türkiye",
  };
  const contactParty = {
    name: ct.name, vkn: ct.taxNumber, tckn: ct.tckn, office: ct.taxOffice,
    address: ct.address, neighborhood: ct.neighborhood, district: ct.district,
    city: ct.city, postalCode: ct.postalCode, country: ct.country ?? "Türkiye",
  };
  const supplier = inv.type === "SALES" ? companyParty : contactParty;
  const customer = inv.type === "SALES" ? contactParty : companyParty;

  const partyId = (p: typeof supplier) =>
    p.tckn
      ? `        <cbc:ID schemeID="TCKN">${esc(p.tckn)}</cbc:ID>`
      : `        <cbc:ID schemeID="VKN">${esc(p.vkn ?? "1111111111")}</cbc:ID>`;

  const party = (p: typeof supplier, tag: string) => `  <cac:${tag}>
    <cac:Party>
      <cac:PartyIdentification>
${partyId(p)}
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${esc(p.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(p.address)}</cbc:StreetName>
        <cbc:CitySubdivisionName>${esc(p.neighborhood ?? p.district)}</cbc:CitySubdivisionName>
        <cbc:CityName>${esc(p.city)}</cbc:CityName>
        <cbc:PostalZone>${esc(p.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:Name>${esc(p.country)}</cbc:Name></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme><cbc:Name>${esc(p.office ?? "")}</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:${tag}>`;

  const lines = inv.lines
    .map((l, i) => {
      const gross = Number(l.quantity) * Number(l.unitPrice);
      const disc = Number(l.discountAmount);
      const unitCode = /kg|kilo/i.test(l.unit) ? "KGM" : /saat|hour/i.test(l.unit) ? "HUR" : "C62";
      const allowance = disc > 0
        ? `    <cac:AllowanceCharge>
      <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
      <cbc:MultiplierFactorNumeric>${n(Number(l.discountRate) / 100)}</cbc:MultiplierFactorNumeric>
      <cbc:Amount currencyID="${currency}">${n(disc)}</cbc:Amount>
      <cbc:BaseAmount currencyID="${currency}">${n(gross)}</cbc:BaseAmount>
    </cac:AllowanceCharge>\n`
        : "";
      return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${unitCode}">${n(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${n(l.netAmount)}</cbc:LineExtensionAmount>
${allowance}    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${n(l.taxAmount)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${currency}">${n(l.netAmount)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${currency}">${n(l.taxAmount)}</cbc:TaxAmount>
        <cbc:Percent>${n(l.taxRate)}</cbc:Percent>
        <cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item><cbc:Name>${esc(l.description ?? "Kalem")}</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${currency}">${n(l.unitPrice)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${profile}</cbc:ProfileID>
  <cbc:ID>${esc(inv.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${esc(uuid)}</cbc:UUID>
  <cbc:IssueDate>${d(inv.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${t(inv.issueDate)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${typeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
${party(supplier, "AccountingSupplierParty")}
${party(customer, "AccountingCustomerParty")}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${n(inv.taxTotal)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${n(inv.netTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${n(inv.netTotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${n(inv.grandTotal)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${currency}">${n(inv.discountTotal)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${currency}">${n(inv.grandTotal)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}
