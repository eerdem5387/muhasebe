import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/context";
import { updateCompanyAction } from "@/app/actions/company";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { CompanyFields } from "../../company-fields";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  const company = await ctx.db.company.findFirst({ where: { id } });
  if (!company) notFound();

  return (
    <div>
      <PageHeader
        title={`Şirket Düzenle · ${company.name}`}
        description="Faturanın satıcı bloğunda görünecek bilgiler."
        actions={<Link href="/companies" className="btn-secondary">Listeye dön</Link>}
      />
      <div className="card max-w-3xl p-6">
        <ActionForm action={updateCompanyAction} submitLabel="Değişiklikleri kaydet">
          <input type="hidden" name="id" value={company.id} />
          <CompanyFields
            d={{
              name: company.name,
              taxNumber: company.taxNumber,
              taxOffice: company.taxOffice,
              address: company.address,
              neighborhood: company.neighborhood,
              district: company.district,
              city: company.city,
              country: company.country,
              postalCode: company.postalCode,
              phone: company.phone,
              email: company.email,
              iban: company.iban,
              tradeRegistryNo: company.tradeRegistryNo,
              mersisNo: company.mersisNo,
              businessCenter: company.businessCenter,
            }}
          />
        </ActionForm>
      </div>
    </div>
  );
}
