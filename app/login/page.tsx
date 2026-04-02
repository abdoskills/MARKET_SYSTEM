"use client";

import { useState } from "react";
import { User, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

type SessionRole = "ADMIN" | "MANAGER" | "CASHIER" | "CLIENT";

function getRedirectPath(role: SessionRole) {
  if (role === "ADMIN" || role === "MANAGER") return "/analytics";
  if (role === "CASHIER") return "/pos";
  return "/";
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload = { identifier: identifier.trim(), password };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        role?: SessionRole;
      };

      if (!response.ok || !data.ok) {
        if (data.error === "INVALID_CREDENTIALS") {
          setError("بيانات الدخول غير صحيحة.");
        } else if (data.error === "ACCOUNT_LOCKED") {
          setError("الحساب مقفل مؤقتًا بسبب محاولات كثيرة.");
        } else if (data.error === "ACCOUNT_NOT_VERIFIED") {
          setError("الحساب غير مفعل. تحقق من بريدك ثم أدخل كود التفعيل.");
        } else if (data.error === "ACCOUNT_DISABLED") {
          setError("الحساب غير نشط. تواصل مع الإدارة.");
        } else {
          setError("تعذر تسجيل الدخول حالياً.");
        }
        return;
      }

      window.location.assign(getRedirectPath(data.role ?? "CASHIER"));
      return;
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLogin();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-white flex items-center justify-center p-4 sm:p-8 font-sans antialiased" dir="rtl">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-ambient p-6 sm:p-8 border-none">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#003527]/10 text-[#003527] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <User size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold font-serif text-[#003527] mb-1">تسجيل الدخول</h1>
          <p className="text-[#404944] text-sm">الدخول بالايميل أو رقم الهاتف.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#1c1c18] mb-2 font-sans">الايميل أو رقم الهاتف</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#bfc9c3]">
                <User size={20} />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@lartisan.local"
                className="w-full min-h-[48px] pl-4 pr-12 bg-surface-container-lowest border border-[#e5e2db] text-[#1c1c18] rounded-xl outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1c1c18] mb-2 font-sans">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#bfc9c3]">
                <Lock size={20} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full min-h-[48px] pl-4 pr-12 bg-surface-container-lowest border border-[#e5e2db] text-[#1c1c18] rounded-xl outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]"
              />
            </div>
          </div>

          {error && <p className="rounded-xl bg-[#ba1a1a]/10 p-3 text-sm font-bold text-[#ba1a1a]">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] bg-[#003527] text-white font-bold rounded-xl hover:bg-[#064e3b] active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="font-sans">دخول</span>
                <ArrowLeft size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-bold text-[#735c00] hover:opacity-80 transition-opacity">
            نسيت كلمة المرور؟
          </Link>
          <Link href="/verify" className="font-bold text-[#735c00] hover:opacity-80 transition-opacity">
            تفعيل الحساب
          </Link>
        </div>

        <Link href="/register" className="mt-4 block text-center text-sm font-bold text-[#003527] hover:opacity-80 transition-opacity">
          التسجيل كمستخدم جديد
        </Link>
      </div>
    </div>
  );
}
