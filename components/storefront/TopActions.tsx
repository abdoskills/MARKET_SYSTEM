"use client";

import { useCartStore } from "@/lib/store/cartStore";
import { useUIStore } from "@/lib/store/uiStore";
import Link from "next/link";
import type { SessionRole } from "@/lib/auth/session";

export default function TopActions({
  isAuthenticated,
  role,
}: {
  isAuthenticated: boolean;
  role?: SessionRole;
}) {
  const count = useCartStore((state) => state.totals.itemsCount);
  const openCart = useUIStore((state) => state.openCart);

  return (
    <>
      <button
        type="button"
        className="relative scale-95 active:scale-90 transition-transform cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
        onClick={openCart}
        aria-label="فتح السلة"
      >
        <span className="material-symbols-outlined text-slate-600">shopping_cart</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#ba1a1a] text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
            {count}
          </span>
        )}
      </button>
      {isAuthenticated ? (
        <>
          {role === "ADMIN" ? (
            <Link
              href="/admin/logs"
              className="min-h-[44px] px-3 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center justify-center hover:bg-emerald-50"
            >
              Dashboard
            </Link>
          ) : null}
          <Link
            href="/account"
            className="scale-95 active:scale-90 transition-transform cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="الحساب الشخصي"
          >
            <span className="material-symbols-outlined text-slate-600">account_circle</span>
          </Link>
        </>
      ) : (
        <Link
          href="/login"
          className="min-h-[44px] px-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center hover:bg-slate-50"
        >
          تسجيل الدخول
        </Link>
      )}
    </>
  );
}
