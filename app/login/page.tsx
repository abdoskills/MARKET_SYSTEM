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
    <div className="min-h-screen bg-[#e8f3ee] flex items-center justify-center p-4 sm:p-8" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-6 sm:p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#e8f3ee] text-[#006c4a] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">تسجيل الدخول</h1>
          <p className="text-gray-500 text-sm">الدخول بالايميل/الهاتف + كلمة المرور.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الايميل أو رقم الهاتف</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                <User size={20} />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@pristine.local"
                className="w-full min-h-[48px] pl-4 pr-12 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full min-h-[48px] pl-4 pr-12 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a] transition-all"
              />
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] bg-[#006c4a] text-white font-bold rounded-xl hover:bg-opacity-90 disabled:bg-opacity-70 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>دخول</span>
                <ArrowLeft size={20} />
              </>
            )}
          </button>
        </form>

        <Link href="/register" className="mt-4 block text-center text-sm font-bold text-[#006c4a]">
          إنشاء حساب جديد
        </Link>
      </div>
    </div>
  );
}
