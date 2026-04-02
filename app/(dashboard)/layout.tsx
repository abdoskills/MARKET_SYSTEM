import AdminSidebar from "@/components/dashboard/AdminSidebar";
import { getServerSession } from "@/lib/auth/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans antialiased" dir="rtl">
      <AdminSidebar role={session?.role ?? "CASHIER"} />
      <main className="mr-0 min-h-screen pt-20 md:mr-64 md:pt-0">
        {children}
      </main>
    </div>
  );
}
