"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف أو أكثر.");
      return;
    }

    if (password !== confirm) {
      setError("تأكيد كلمة المرور غير متطابق.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        if (data.error === "INVALID_OR_EXPIRED_TOKEN") {
          setError("الرابط غير صالح أو منتهي الصلاحية.");
        } else {
          setError("تعذر تغيير كلمة المرور.");
        }
        return;
      }

      setDone(true);
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-[#eaf4ef] p-4 sm:p-8" dir="rtl">
        <section className="mx-auto w-full max-w-lg rounded-[2rem] bg-[#f6fbf8] p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-black text-[#006c4a]">رابط غير صالح</h1>
          <p className="mt-3 text-sm text-slate-600">الرجاء طلب رابط جديد لإعادة تعيين كلمة المرور.</p>
          <Link href="/forgot-password" className="mt-4 inline-block font-bold text-[#006c4a]">
            طلب رابط جديد
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eaf4ef] p-4 sm:p-8" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-[2rem] bg-[#f6fbf8] p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-black text-[#006c4a]">إعادة تعيين كلمة المرور</h1>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="كلمة المرور الجديدة"
            className="w-full rounded-2xl bg-white px-4 py-3 outline-none ring-2 ring-transparent transition focus:ring-[#006c4a]/30"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="تأكيد كلمة المرور"
            className="w-full rounded-2xl bg-white px-4 py-3 outline-none ring-2 ring-transparent transition focus:ring-[#006c4a]/30"
          />

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          {done && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">تم تحديث كلمة المرور بنجاح.</p>}

          <button type="submit" disabled={loading || done} className="w-full rounded-2xl bg-[#006c4a] px-4 py-3 font-bold text-white disabled:opacity-60">
            {loading ? "..." : "حفظ كلمة المرور"}
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-center text-sm font-bold text-[#006c4a]">
          العودة لتسجيل الدخول
        </Link>
      </section>
    </main>
  );
}
