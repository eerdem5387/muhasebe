import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/context";
import { AppShell } from "@/components/app-shell";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/api/auth/clear");

  return (
    <AppShell>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <Topbar
          email={ctx.email}
          name={ctx.name}
          role={ctx.role}
          schoolName={ctx.tenantName}
          isSuperAdmin={ctx.isSuperAdmin}
          memberships={ctx.memberships}
          activeTenantId={ctx.tenantId}
        />
        </div>
        <main className="flex-1 overflow-x-hidden p-4 lg:p-8 print:p-0">{children}</main>
      </div>
    </AppShell>
  );
}
