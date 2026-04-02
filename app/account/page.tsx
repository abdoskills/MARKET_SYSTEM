import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { formatEgp } from "@/lib/format/locale";
import LogoutButton from "@/components/storefront/LogoutButton";

export default async function AccountPage() {
  const session = await getServerSession();
  const walletProfile = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          walletBalance: true,
          walletTransactions: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              type: true,
              amount: true,
              balanceAfter: true,
              note: true,
              createdAt: true,
            },
          },
        },
      })
    : null;

  const walletBalance = Number(walletProfile?.walletBalance ?? 0);

  return (
    <main className="min-h-screen bg-[#f7f9fb] p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm">
          <h1 className="text-2xl font-black text-[#006c4a] mb-2">الحساب الشخصي</h1>

          {!session ? (
            <>
              <p className="text-slate-600 mb-6">أنت غير مسجل دخول حالياً. قم بتسجيل الدخول أو إنشاء حساب جديد.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/login"
                  className="min-h-[44px] rounded-xl bg-[#006c4a] text-white font-bold flex items-center justify-center"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  className="min-h-[44px] rounded-xl bg-[#e8f3ee] text-[#006c4a] font-bold flex items-center justify-center"
                >
                  إنشاء حساب
                </Link>
                <Link
                  href="/cart"
                  className="min-h-[44px] rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center sm:col-span-2"
                >
                  تعديل الكميات وإدخال العنوان
                </Link>
              </div>
            </>
          ) : (
            <>
              <section className="mb-4 rounded-[2.5rem] bg-primary-container p-6 text-white shadow-ambient">
                <p className="text-sm text-white/90">المحفظة الرقمية (الفكة)</p>
                <p className="mt-3 font-display text-4xl font-black tracking-tight">{formatEgp(walletBalance)}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-300/30 px-4 py-1.5 text-sm font-bold text-amber-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  Gold Wallet
                </div>
              </section>

              <section className="mb-4 rounded-3xl bg-[#f2f8f5] p-4">
                <h2 className="mb-3 text-lg font-black text-[#006c4a]">آخر معاملات المحفظة</h2>

                {!walletProfile?.walletTransactions.length ? (
                  <p className="rounded-2xl bg-white/70 p-3 text-sm text-slate-600">لا توجد معاملات بعد.</p>
                ) : (
                  <div className="space-y-2">
                    {walletProfile.walletTransactions.map((tx) => {
                      const isAdded = tx.type === "FAKKA_ADDED";
                      return (
                        <div key={tx.id} className="rounded-2xl bg-white/80 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-bold ${isAdded ? "text-emerald-700" : "text-amber-700"}`}>
                              {isAdded ? "إضافة فكة" : "صرف من المحفظة"}
                            </p>
                            <p className="font-display text-sm font-bold text-slate-800">{formatEgp(Number(tx.amount))}</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{tx.note || "معاملة محفظة"}</p>
                          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                            <span>{new Date(tx.createdAt).toLocaleString("ar-EG")}</span>
                            <span className="font-display">الرصيد: {formatEgp(Number(tx.balanceAfter))}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
                <p className="text-sm text-slate-500">معرف المستخدم</p>
                <p className="font-mono text-sm text-slate-800 break-all">{session.userId}</p>
                <p className="text-sm text-slate-500 mt-3">الدور</p>
                <p className="font-bold text-[#006c4a]">{session.role}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/" className="min-h-[44px] rounded-xl bg-[#e8f3ee] px-4 text-[#006c4a] font-bold flex items-center">
                  العودة للمتجر
                </Link>
                <Link href="/cart" className="min-h-[44px] rounded-xl bg-slate-100 px-4 text-slate-700 font-bold flex items-center">
                  تعديل الكميات والعنوان
                </Link>
                {session.role === "ADMIN" ? (
                  <Link href="/admin/logs" className="min-h-[44px] rounded-xl bg-[#006c4a] px-4 text-white font-bold flex items-center">
                    الذهاب للوحة التحكم
                  </Link>
                ) : null}
                <LogoutButton />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
