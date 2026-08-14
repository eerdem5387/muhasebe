import { requireAuth, canManageSettings } from "@/lib/context";
import { createCardBankAction, createCategoryAction, deleteCardBankAction, deleteCategoryAction } from "@/app/actions/settings";
import { createSchoolWithAdminAction, createUserAction, deleteUserAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { ROLE_TR } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const ctx = await requireAuth();
  if (!canManageSettings(ctx.role, ctx.isSuperAdmin)) {
    return (
      <div className="card p-8 text-sm text-slate-600">
        Ayarlar yalnızca yöneticiler içindir.
      </div>
    );
  }

  const [categories, banks, memberships] = await Promise.all([
    ctx.db.ledgerCategory.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    ctx.db.cardBankSetting.findMany({ orderBy: { bankName: "asc" } }),
    prisma.tenantUser.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Ayarlar" description="Kalemler, kredi kartı anlaşmaları ve kullanıcılar." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {ctx.isSuperAdmin && (
          <div className="card border-amber-200 bg-amber-50/40 p-5 lg:col-span-2">
            <h2 className="mb-1 font-semibold text-slate-900">Yeni okul / şirket + yönetici</h2>
            <p className="mb-4 text-sm text-slate-600">
              Süper admin olarak yeni bir okul oluşturur ve o okul için yönetici (şirket kullanıcısı) hesabı açar.
            </p>
            <ActionForm action={createSchoolWithAdminAction} submitLabel="Okul ve yönetici oluştur">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="schoolName">Okul / şirket adı</label>
                  <input id="schoolName" name="schoolName" className="input" required placeholder="Örn: Atatürk İlkokulu" />
                </div>
                <div>
                  <label className="label" htmlFor="adminName">Yönetici ad soyad</label>
                  <input id="adminName" name="name" className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="adminEmail">Yönetici e-posta</label>
                  <input id="adminEmail" name="email" type="email" className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="adminPassword">Yönetici şifre</label>
                  <input id="adminPassword" name="password" type="password" className="input" required minLength={6} />
                </div>
              </div>
            </ActionForm>
          </div>
        )}

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Gelir / gider kalemleri</h2>
          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>{c.type === "EXPENSE" ? "Gider" : "Gelir"} · {c.name}</span>
                <MiniForm action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-red-600">Sil</button>
                </MiniForm>
              </li>
            ))}
          </ul>
          <ActionForm action={createCategoryAction} submitLabel="Kalem ekle">
            <div>
              <label className="label" htmlFor="type">Tür</label>
              <select id="type" name="type" className="input" defaultValue="EXPENSE">
                <option value="EXPENSE">Gider</option>
                <option value="INCOME">Gelir</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="name">Ad</label>
              <input id="name" name="name" className="input" required placeholder="Kırtasiye" />
            </div>
          </ActionForm>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Kredi kartı banka anlaşmaları</h2>
          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {banks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span>{b.bankName} · bloke {b.blockDays} gün</span>
                <MiniForm action={deleteCardBankAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="text-xs text-red-600">Sil</button>
                </MiniForm>
              </li>
            ))}
          </ul>
          <ActionForm action={createCardBankAction} submitLabel="Anlaşma ekle">
            <div>
              <label className="label" htmlFor="bankName">Banka adı</label>
              <input id="bankName" name="bankName" className="input" required placeholder="Ziraat Bankası" />
            </div>
            <div>
              <label className="label" htmlFor="blockDays">Bloke süresi (gün)</label>
              <input id="blockDays" name="blockDays" type="number" min={0} className="input" defaultValue={30} required />
            </div>
          </ActionForm>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-1 font-semibold">Bu okulun kullanıcıları</h2>
          <p className="mb-4 text-sm text-slate-500">{ctx.tenantName} için muhasebe / müdür / kurucu hesapları.</p>
          <table className="mb-4 w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Ad</th>
                <th className="th">E-posta</th>
                <th className="th">Rol</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberships.map((m) => (
                <tr key={m.id}>
                  <td className="td">
                    {m.user.name}
                    {m.user.isSuperAdmin ? (
                      <span className="ml-2 text-xs text-amber-700">(süper admin)</span>
                    ) : null}
                  </td>
                  <td className="td">{m.user.email}</td>
                  <td className="td">{ROLE_TR[m.role]}</td>
                  <td className="td text-right">
                    {m.userId !== ctx.userId && (
                      <MiniForm action={deleteUserAction}>
                        <input type="hidden" name="id" value={m.userId} />
                        <button className="text-xs text-red-600">Çıkar</button>
                      </MiniForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ActionForm action={createUserAction} submitLabel="Kullanıcı ekle">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="userName">Ad soyad</label>
                <input id="userName" name="name" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="userEmail">E-posta</label>
                <input id="userEmail" name="email" type="email" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="userPassword">Şifre</label>
                <input id="userPassword" name="password" type="password" className="input" required minLength={6} />
              </div>
              <div>
                <label className="label" htmlFor="role">Rol</label>
                <select id="role" name="role" className="input" defaultValue="ACCOUNTANT">
                  <option value="ACCOUNTANT">Muhasebe</option>
                  <option value="PRINCIPAL">Müdür</option>
                  <option value="FOUNDER">Kurucu</option>
                  <option value="ADMIN">Yönetici</option>
                </select>
              </div>
            </div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
