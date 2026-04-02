"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        setError("تعذر إرسال رابط الاستعادة حالياً.");
        return;
      }

      setSent(true);
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eaf4ef] p-4 sm:p-8" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-[2rem] bg-[#f6fbf8] p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-black text-[#006c4a]">نسيت كلمة المرور</h1>
        <p className="mt-2 text-sm text-slate-600">أدخل بريدك وسنرسل رابط إعادة تعيين صالح لمدة ساعة.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@example.com"
            className="w-full rounded-2xl bg-white px-4 py-3 outline-none ring-2 ring-transparent transition focus:ring-[#006c4a]/30"
          />

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          {sent && (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              إذا كان البريد موجودًا فسيصل رابط الاستعادة خلال لحظات.
            </p>
          )}

          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#006c4a] px-4 py-3 font-bold text-white disabled:opacity-60">
            {loading ? "..." : "إرسال رابط الاستعادة"}
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-center text-sm font-bold text-[#006c4a]">
          العودة لتسجيل الدخول
        </Link>
      </section>
    </main>
  );
}
