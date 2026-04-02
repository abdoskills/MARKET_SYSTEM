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
          fullName: true,
          email: true,
          role: true,
          walletBalance: true,
          walletTransactions: {
            orderBy: { createdAt: "desc" },
            take: 3,
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
  const fullName = walletProfile?.fullName || "مستخدم جديد";
  const userRole = walletProfile?.role === "ADMIN" ? "مدير النظام" : "عضو ذهبي";
  const email = walletProfile?.email || "";

  return (
    <main className="min-h-[max(884px,100dvh)] pb-24 lg:pb-0 transition-colors bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-white text-[#1c1c18] font-sans antialiased" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl dark:bg-[#002117]/80">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <Link href="/" className="scale-102 transition-transform active:scale-95 text-[#003527] dark:text-emerald-50">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
          </Link>
          <h1 className="font-serif text-lg tracking-wide text-[#003527] dark:text-emerald-50">حسابي</h1>
          <div className="h-10 w-10 overflow-hidden rounded-full border border-[#735c00] p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#e5e2db] text-[#003527] font-bold">
              {fullName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <div className="mx-auto mb-16 max-w-4xl space-y-12 px-6 pt-24 text-[#1c1c18]">
        
        {!session ? (
          <section className="flex flex-col items-center text-center space-y-4 py-8">
            <h2 className="text-2xl font-serif font-bold text-[#003527]">تسجيل الدخول مطلوب</h2>
            <p className="text-[#404944]">الرجاء تسجيل الدخول لعرض حسابك</p>
            <div className="flex gap-4 mt-4">
              <Link href="/login" className="px-6 py-3 bg-[#003527] text-white rounded-lg font-bold">تسجيل الدخول</Link>
              <Link href="/register" className="px-6 py-3 bg-[#e5e2db] text-[#003527] rounded-lg font-bold">إنشاء حساب</Link>
            </div>
          </section>
        ) : (
          <>
            {/* Hero Profile Section */}
            <section className="flex flex-col items-center space-y-4 py-8 text-center">
              <div className="group relative">
                <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-[#735c00] bg-white p-1 shadow-lg">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#e5e2db] text-5xl font-bold text-[#003527]">
                    {fullName.charAt(0)}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="font-serif text-3xl font-bold text-[#003527]">{fullName}</h2>
                <div className="flex items-center justify-center gap-2 text-[#735c00]">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span className="font-serif text-sm font-semibold tracking-wide">{userRole}</span>
                </div>
              </div>

              {/* Wallet Bento Component replacing Points */}
              <div className="mt-6 flex w-full items-center justify-between rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 shadow-[0_20px_50px_rgba(16,185,129,0.3)] p-6">
                <div className="text-right">
                  <p className="mb-1 font-sans text-xs uppercase tracking-widest text-emerald-50">الرصيد الحالي</p>
                  <p className="font-serif text-2xl font-bold text-[#F59E0B] drop-shadow-md">{formatEgp(walletBalance)}</p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-black/20 backdrop-blur-sm p-4">
                  <span className="material-symbols-outlined text-3xl text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">محفظة الفكة</p>
                    <p className="text-[10px] text-emerald-100">تضاف الفكة تلقائياً هنا</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Account Grid */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Recent Transactions (Replaces My Orders) */}
              <div className="rounded-lg bg-white/80 backdrop-blur-md p-6 shadow-ambient transition-all duration-300 hover:shadow-lg border-none">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-[#f6f3ec] p-2">
                      <span className="material-symbols-outlined text-[#003527]">receipt_long</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#003527]">طلباتي ومعاملاتي</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  {walletProfile?.walletTransactions.length === 0 ? (
                    <p className="text-sm text-[#404944]">لا توجد معاملات سابقة.</p>
                  ) : (
                    walletProfile?.walletTransactions.map(tx => {
                      const isAdded = tx.type === "FAKKA_ADDED";
                      return (
                        <div key={tx.id} className="flex items-center justify-between rounded bg-[#f6f3ec] p-3">
                          <div>
                            <p className="text-sm font-bold text-[#1c1c18] drop-shadow-sm">{isAdded ? "إضافة فكة من طلب" : "دفع من المحفظة"}</p>
                            <p className="text-xs text-[#404944] mt-1">
                              {new Intl.DateTimeFormat("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(tx.createdAt))}
                            </p>
                          </div>
                          <span className={`px-3 py-1 text-[11px] rounded uppercase font-bold tracking-wider ${isAdded ? 'bg-[#003527] text-white' : 'bg-[#ba1a1a] text-white'}`}>
                            {formatEgp(Number(tx.amount))}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Saved Addresses / Information equivalent */}
              <div className="rounded-lg bg-white/80 backdrop-blur-md p-6 shadow-ambient transition-all duration-300 border-none hover:shadow-lg">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-[#f6f3ec] p-2">
                      <span className="material-symbols-outlined text-[#003527]">location_on</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#003527]">عناوين التوصيل</h3>
                  </div>
                  <Link href="/cart" className="material-symbols-outlined text-[#735c00] cursor-pointer block hover:scale-105 transition-transform">add_circle</Link>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f6f3ec]">
                    <span className="material-symbols-outlined text-[#064e3b]">home</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#1c1c18]">المنزل</p>
                    <p className="text-xs leading-relaxed text-[#404944]">يتم اختيار العنوان أثناء إتمام الطلب من سلة التسوق</p>
                  </div>
                </div>
              </div>

              {/* Add Payment Methods (Dummy View from User snippet) */}
              <div className="rounded-lg bg-white/80 backdrop-blur-md p-6 shadow-ambient transition-all duration-300 border-none hover:shadow-lg">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-[#f6f3ec] p-2">
                      <span className="material-symbols-outlined text-[#003527]">payments</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#003527]">طرق الدفع</h3>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#bfc9c3]/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#735c00]">account_balance_wallet</span>
                      <p className="text-sm text-[#1c1c18]">الدفع نقداً أو باستخدام الفكة</p>
                    </div>
                    <span className="rounded bg-[#fed65b]/20 px-2 py-0.5 text-[10px] font-bold text-[#735c00]">الافتراضية</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1 cursor-not-allowed opacity-50">
                    <span className="material-symbols-outlined text-[#404944]">add</span>
                    <p className="text-xs font-bold text-[#404944]">إضافة بطاقة جديدة (قريباً)</p>
                  </div>
                </div>
              </div>

              {/* Settings & Privacy (for Logout) */}
              <div className="rounded-lg bg-white/80 backdrop-blur-md p-6 shadow-ambient transition-all duration-300 border-none hover:shadow-lg">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded bg-[#f6f3ec] p-2">
                    <span className="material-symbols-outlined text-[#003527]">settings</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#003527]">الإعدادات والخصوصية</h3>
                </div>
                <ul className="space-y-4">
                  {session.role === "ADMIN" && (
                    <li className="flex cursor-pointer items-center justify-between text-[#404944] transition-colors hover:text-[#003527]">
                      <Link href="/admin/logs" className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold text-[#003527]">لوحة تحكم المشرف</span>
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </Link>
                    </li>
                  )}
                  <li className="flex cursor-pointer items-center justify-between text-[#404944] transition-colors hover:text-[#003527]">
                    <span className="text-sm">تفضيلات الإشعارات</span>
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </li>
                  <li className="flex cursor-pointer items-center justify-between text-[#404944] transition-colors hover:text-[#003527]">
                    <span className="text-sm">سياسة الخصوصية</span>
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </li>
                  <li className="flex items-center justify-between pt-2">
                    <LogoutButton className="flex cursor-pointer items-center justify-between w-full text-error hover:opacity-80 transition-opacity bg-transparent p-0 m-0 outline-none text-[#ba1a1a]">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
                        <span className="text-sm font-bold">تسجيل الخروج</span>
                      </div>
                    </LogoutButton>
                  </li>
                </ul>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Bottom Navigation Bar (Mobile) */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t bg-white/80 backdrop-blur-md border-stone-200/30 pb-safe shadow-[0_-4px_24px_rgba(28,28,24,0.04)] md:hidden">
        <Link href="/" className="flex flex-col items-center justify-center px-4 py-4 text-[#003527]/60 hover:bg-[#e5e2db]/30">
          <span className="material-symbols-outlined">home</span>
          <span className="mt-1 font-sans text-[10px]">الرئيسية</span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center justify-center px-4 py-4 text-[#003527]/60 hover:bg-[#e5e2db]/30">
          <span className="material-symbols-outlined">local_mall</span>
          <span className="mt-1 font-sans text-[10px]">المتجر</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center justify-center px-4 py-4 text-[#003527]/60 hover:bg-[#e5e2db]/30">
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="mt-1 font-sans text-[10px]">الطلبات</span>
        </Link>
        <Link href="/account" className="flex flex-col items-center justify-center px-4 py-4 font-bold text-[#735c00] duration-200 scale-110">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          <span className="mt-1 font-sans text-[10px]">حسابي</span>
        </Link>
      </nav>

      {/* Sidebar Navigation (Desktop) */}
      <aside className="fixed right-0 top-0 z-[60] hidden h-full w-80 flex-col bg-white/80 backdrop-blur-md shadow-2xl lg:flex border-l border-[#e5e2db]/50">
        <div className="border-b border-[#e5e2db] p-8">
          <div className="flex items-center gap-4 text-right">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#735c00]">
              <div className="flex h-full w-full items-center justify-center bg-[#f6f3ec] text-[#003527] font-bold text-xl">
                {fullName.charAt(0)}
              </div>
            </div>
            <div>
              <h4 className="font-serif text-lg font-black text-[#003527]">{fullName}</h4>
              <p className="text-xs font-bold text-[#735c00]">{userRole}</p>
              <p className="mt-1 text-[10px] text-[#404944]">{email}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-8">
          <ul className="space-y-1">
            <li>
              <Link href="/" className="flex items-center gap-4 px-8 py-4 text-[#003527]/80 transition-all duration-300 hover:bg-[#e5e2db]/30">
                <span className="material-symbols-outlined">home</span>
                <span className="font-serif text-sm">الرئيسية للمتجر</span>
              </Link>
            </li>
            <li>
              <Link href="/cart" className="flex items-center gap-4 px-8 py-4 text-[#003527]/80 transition-all duration-300 hover:bg-[#e5e2db]/30">
                <span className="material-symbols-outlined">local_mall</span>
                <span className="font-serif text-sm">التسوق والسلة</span>
              </Link>
            </li>
            <li>
              <Link href="/orders" className="flex items-center gap-4 px-8 py-4 text-[#003527]/80 transition-all duration-300 hover:bg-[#e5e2db]/30">
                <span className="material-symbols-outlined">receipt_long</span>
                <span className="font-serif text-sm">طلباتي</span>
              </Link>
            </li>
            <li>
              <Link href="/account" className="flex items-center gap-4 border-r-4 border-[#735c00] bg-[#064e3b]/5 px-8 py-4 text-[#735c00] transition-all duration-300">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                <span className="font-serif font-bold text-sm">حسابي</span>
              </Link>
            </li>
            <li>
              <Link href="#" className="flex items-center gap-4 px-8 py-4 text-[#003527]/80 transition-all duration-300 hover:bg-[#e5e2db]/30">
                <span className="material-symbols-outlined">help_outline</span>
                <span className="font-serif text-sm">المساعدة</span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="p-8">
          <LogoutButton className="flex w-full items-center justify-center gap-2 rounded bg-[#003527] py-4 text-sm font-bold text-white transition-colors hover:bg-[#064e3b]">
            <span className="material-symbols-outlined">logout</span>
            تسجيل الخروج
          </LogoutButton>
        </div>
      </aside>
    </main>
  );
}
