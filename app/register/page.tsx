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

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        needsVerification?: boolean;
      };
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

      if (data.needsVerification && email.trim()) {
        router.replace(`/verify?email=${encodeURIComponent(email.trim())}`);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-white p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-md rounded-3xl border-none bg-white/80 backdrop-blur-xl p-8 shadow-ambient">
        <h1 className="text-2xl font-black text-[#003527] mb-2">إنشاء حساب</h1>
        <p className="text-sm text-slate-500 mb-5">أدخل بياناتك لإنشاء حساب جديد.</p>

        <form onSubmit={submit} className="space-y-3">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="الاسم الكامل" className="w-full min-h-[48px] bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني (اختياري)" className="w-full min-h-[48px] bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full min-h-[48px] bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="كلمة المرور (8+ أحرف)" className="w-full min-h-[48px] bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]" />

          {error && <p className="rounded-xl bg-[#ba1a1a]/10 p-3 text-sm font-bold text-[#ba1a1a]">{error}</p>}

          <button disabled={loading} className="w-full min-h-[48px] rounded-xl bg-[#003527] text-white font-bold disabled:opacity-60 shadow-md hover:bg-[#064e3b] active:scale-[0.98] transition-all font-sans mt-2">
            {loading ? "..." : "إنشاء الحساب"}
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-center text-sm font-bold text-[#003527]">
          عندك حساب؟ تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}
