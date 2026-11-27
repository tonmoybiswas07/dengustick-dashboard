import { getPersonalSettings } from "@/lib/settings";
import { requirePermission } from "@/lib/session";
import Sidebar from "@/components/dashboard/sidebar/Sidebar";
import Navbar from "@/components/dashboard/navbar/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePermission("dashboard:view");

  const preferences = await getPersonalSettings(session.user.id);
  const role = session.user.role ?? "";

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar role={role} />
      </div>

      <div className="min-w-0 lg:pl-64">
        <Navbar
          preferences={preferences}
          user={{
            name: session.user.name,
            email: session.user.email,
            role,
          }}
        />

        <main className="mx-auto max-w-[1800px] p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}