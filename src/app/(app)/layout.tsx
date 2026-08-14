import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/context";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  // Must not call cookies().delete here — Next forbids cookie writes during RSC render.
  if (!ctx) redirect("/api/auth/clear");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={ctx.email} name={ctx.name} role={ctx.role} schoolName={ctx.tenantName} />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
