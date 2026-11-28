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
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:p-3 focus:text-foreground"
      >
        Skip to dashboard content
      </a>
      <div className="sticky top-0 z-40 hidden h-dvh self-start lg:block">
        <Sidebar role={role} />
      </div>

      <div className="min-w-0">
        <Navbar
          preferences={preferences}
          user={{
            name: session.user.name,
            email: session.user.email,
            role,
          }}
        />

        <main
          id="dashboard-content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[1680px] p-3 sm:p-5 xl:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
