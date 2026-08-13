const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
const STAGE_LABEL: Record<string, string> = {
  NEW: "Yeni", CONTACTED: "İletişim", QUALIFIED: "Nitelikli", PROPOSAL: "Teklif", WON: "Kazanıldı", LOST: "Kaybedildi",
};

export interface ContactDefaults {
  name?: string;
  type?: string;
  email?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  tckn?: string | null;
  taxOffice?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  district?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  crmStage?: string;
}

/** Faturada gereken tüm cari alanları. Hem "yeni cari" hem "düzenle" formunda kullanılır. */
export function ContactFields({ d = {} }: { d?: ContactDefaults }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Ünvan / Ad Soyad</label>
          <input id="name" name="name" className="input" defaultValue={d.name ?? ""} required />
        </div>
        <div>
          <label className="label" htmlFor="type">Tür</label>
          <select id="type" name="type" className="input" defaultValue={d.type ?? "CUSTOMER"}>
            <option value="CUSTOMER">Müşteri</option>
            <option value="VENDOR">Tedarikçi</option>
            <option value="LEAD">Aday (Lead)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="crmStage">CRM aşaması</label>
          <select id="crmStage" name="crmStage" className="input" defaultValue={d.crmStage ?? "NEW"}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="taxNumber">Vergi No (VKN)</label>
          <input id="taxNumber" name="taxNumber" className="input" defaultValue={d.taxNumber ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="tckn">TCKN</label>
          <input id="tckn" name="tckn" className="input" defaultValue={d.tckn ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="taxOffice">Vergi Dairesi</label>
          <input id="taxOffice" name="taxOffice" className="input" defaultValue={d.taxOffice ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" className="input" defaultValue={d.email ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Telefon</label>
          <input id="phone" name="phone" className="input" defaultValue={d.phone ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">Cadde / Sokak / No</label>
          <input id="address" name="address" className="input" defaultValue={d.address ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="neighborhood">Mahalle</label>
          <input id="neighborhood" name="neighborhood" className="input" defaultValue={d.neighborhood ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="district">İlçe</label>
          <input id="district" name="district" className="input" defaultValue={d.district ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="city">İl</label>
          <input id="city" name="city" className="input" defaultValue={d.city ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="postalCode">Posta Kodu</label>
          <input id="postalCode" name="postalCode" className="input" defaultValue={d.postalCode ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="country">Ülke</label>
          <input id="country" name="country" className="input" defaultValue={d.country ?? "Türkiye"} />
        </div>
      </div>
    </>
  );
}
