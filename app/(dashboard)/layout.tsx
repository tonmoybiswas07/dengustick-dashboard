import Navbar from "@/components/dashboard/navbar/Navbar";
import Sidebar from "@/components/dashboard/sidebar/Sidebar";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>

      <div className="min-w-0 lg:pl-64">
        <Navbar />

        <main className="mx-auto max-w-[1800px] p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}