import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";
import LogoutButton from "@/components/storefront/LogoutButton";

export default async function AccountPage() {
  const session = await getServerSession();

  return (
    <main className="min-h-screen bg-[#f7f9fb] p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
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
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2">
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
