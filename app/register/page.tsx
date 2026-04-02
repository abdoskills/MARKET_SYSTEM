"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (data.error === "USER_ALREADY_EXISTS") {
          setError("هذا الحساب موجود بالفعل.");
        } else if (data.error === "INVALID_PAYLOAD") {
          setError("تأكد من صحة البيانات (البريد الإلكتروني، كلمة المرور 8+ أحرف).");
        } else {
          setError(data.error || "تعذر إنشاء الحساب.");
        }
        return;
      }

      router.replace("/login");
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f9fb] p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-[#006c4a] mb-2">إنشاء حساب</h1>
        <p className="text-sm text-slate-500 mb-5">أدخل بياناتك لإنشاء حساب جديد.</p>

        <form onSubmit={submit} className="space-y-3">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="الاسم الكامل" className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني (اختياري)" className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="كلمة المرور (8+ أحرف)" className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3" />

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <button disabled={loading} className="w-full min-h-[44px] rounded-xl bg-[#006c4a] text-white font-bold disabled:opacity-60">
            {loading ? "..." : "إنشاء الحساب"}
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-center text-sm font-bold text-[#006c4a]">
          عندك حساب؟ تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}
