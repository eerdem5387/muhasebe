import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/context";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={ctx.email}
          role={ctx.role}
          tenants={ctx.memberships.map((m) => ({ id: m.tenantId, label: m.tenantName }))}
          activeTenantId={ctx.tenantId}
          companies={ctx.companies.map((c) => ({ id: c.id, label: c.name }))}
          activeCompanyId={ctx.companyId}
        />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
