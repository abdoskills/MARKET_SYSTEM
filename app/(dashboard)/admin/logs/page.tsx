import { getServerSession } from "@/lib/auth/server";
import { listAuditEvents } from "@/lib/security/audit";
import { redirect } from "next/navigation";

export default async function AdminLogsPage() {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const logs = listAuditEvents(300);

  return (
    <section className="p-6" dir="rtl">
      <h1 className="text-2xl font-black text-[#191c1e]">سجل العمليات (Admin)</h1>
      <p className="mt-1 text-sm text-slate-500">عمليات تسجيل الدخول، تعديل الأسعار، وإلغاء الطلبات.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-5 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
          <div>الوقت</div>
          <div>العملية</div>
          <div>المستخدم</div>
          <div>الكيان</div>
          <div>التفاصيل</div>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">لا توجد سجلات حالياً.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="grid min-w-[760px] grid-cols-5 gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-700">
              <div>{new Date(log.at).toLocaleString("ar-EG")}</div>
              <div className="font-bold text-[#006c4a]">{log.action}</div>
              <div>{log.userId}</div>
              <div>{log.entityId ?? "-"}</div>
              <div className="truncate">{log.details ? JSON.stringify(log.details) : "-"}</div>
            </div>
          ))
        )}
        </div>
      </div>
    </section>
  );
}
