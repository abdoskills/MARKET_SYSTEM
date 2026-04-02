"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") ?? "");
  }, []);

  const codeDigits = useMemo(() => Array.from({ length: 6 }, (_, index) => code[index] ?? ""), [code]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        if (data.error === "INVALID_OR_EXPIRED_CODE") {
          setError("الكود غير صحيح أو منتهي. اطلب كود جديد.");
        } else {
          setError("تعذر التحقق من البريد حالياً.");
        }
        return;
      }

      setMessage("تم التحقق بنجاح. سيتم تحويلك لتسجيل الدخول.");
      setTimeout(() => router.replace("/login"), 900);
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resending || !email.trim()) return;

    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        setError("تعذر إرسال الكود الآن.");
        return;
      }

      setMessage("تم إرسال كود جديد إلى بريدك.");
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eaf4ef] p-4 sm:p-8" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-[2rem] bg-[#f6fbf8] p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-black text-[#006c4a]">تأكيد البريد الإلكتروني</h1>
        <p className="mt-2 text-sm text-slate-600">أدخل كود التحقق المكوّن من 6 أرقام. الصلاحية: 10 دقائق.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@example.com"
            className="w-full rounded-2xl bg-white px-4 py-3 outline-none ring-2 ring-transparent transition focus:ring-[#006c4a]/30"
          />

          <input
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="123456"
            className="sr-only"
            aria-label="Verification code"
          />

          <div
            className="grid grid-cols-6 gap-2"
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[aria-label="Verification code"]');
              el?.focus();
            }}
          >
            {codeDigits.map((digit, idx) => (
              <div
                key={idx}
                className="flex h-14 items-center justify-center rounded-2xl bg-white text-xl font-extrabold tracking-wide text-[#006c4a]"
              >
                {digit || "•"}
              </div>
            ))}
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-2xl bg-[#006c4a] px-4 py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "..." : "تأكيد الحساب"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <button onClick={resend} disabled={resending} className="font-bold text-[#006c4a] disabled:opacity-50">
            {resending ? "جاري الإرسال..." : "إعادة إرسال الكود"}
          </button>
          <Link href="/login" className="font-bold text-slate-600">
            العودة للدخول
          </Link>
        </div>
      </section>
    </main>
  );
}
