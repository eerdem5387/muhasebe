import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/context";
import { updateContactAction } from "@/app/actions/crm";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { ContactFields } from "../../contact-fields";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  const contact = await ctx.db.contact.findFirst({ where: { id } });
  if (!contact) notFound();

  return (
    <div>
      <PageHeader
        title={`Cari Düzenle · ${contact.name}`}
        description="Faturada kullanılacak tüm cari bilgileri."
        actions={
          <>
            <Link href={`/contacts/${contact.id}`} className="btn-secondary">Detay</Link>
            <Link href="/contacts" className="btn-secondary">Listeye dön</Link>
          </>
        }
      />
      <div className="card max-w-3xl p-6">
        <ActionForm action={updateContactAction} submitLabel="Değişiklikleri kaydet">
          <input type="hidden" name="id" value={contact.id} />
          <ContactFields
            d={{
              name: contact.name,
              type: contact.type,
              email: contact.email,
              phone: contact.phone,
              taxNumber: contact.taxNumber,
              tckn: contact.tckn,
              taxOffice: contact.taxOffice,
              address: contact.address,
              neighborhood: contact.neighborhood,
              district: contact.district,
              city: contact.city,
              country: contact.country,
              postalCode: contact.postalCode,
              crmStage: contact.crmStage,
            }}
          />
        </ActionForm>
      </div>
    </div>
  );
}
