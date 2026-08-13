export interface CompanyDefaults {
  name?: string;
  taxNumber?: string | null;
  taxOffice?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  district?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  iban?: string | null;
  tradeRegistryNo?: string | null;
  mersisNo?: string | null;
  businessCenter?: string | null;
}

/** Faturanın satıcı bloğunda görünen tüm şirket bilgileri. */
export function CompanyFields({ d = {} }: { d?: CompanyDefaults }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Şirket ünvanı</label>
        <input id="name" name="name" className="input" defaultValue={d.name ?? ""} required />
      </div>
      <div>
        <label className="label" htmlFor="taxNumber">Vergi No (VKN)</label>
        <input id="taxNumber" name="taxNumber" className="input" defaultValue={d.taxNumber ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="taxOffice">Vergi Dairesi</label>
        <input id="taxOffice" name="taxOffice" className="input" defaultValue={d.taxOffice ?? ""} />
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
      <div>
        <label className="label" htmlFor="phone">Telefon</label>
        <input id="phone" name="phone" className="input" defaultValue={d.phone ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" className="input" defaultValue={d.email ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="iban">IBAN</label>
        <input id="iban" name="iban" className="input" defaultValue={d.iban ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="tradeRegistryNo">Ticaret Sicil No</label>
        <input id="tradeRegistryNo" name="tradeRegistryNo" className="input" defaultValue={d.tradeRegistryNo ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="mersisNo">MERSİS No</label>
        <input id="mersisNo" name="mersisNo" className="input" defaultValue={d.mersisNo ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="businessCenter">İşletme Merkezi</label>
        <input id="businessCenter" name="businessCenter" className="input" defaultValue={d.businessCenter ?? ""} />
      </div>
    </div>
  );
}
