"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store/cartStore";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const totals = useCartStore((state) => state.totals);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <main className="min-h-screen bg-[#f7f9fb] p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-black text-[#006c4a]">سلة المشتريات</h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-slate-600">السلة فارغة حالياً.</p>
            <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#006c4a] px-4 text-white font-bold">
              العودة للتسوق
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{item.nameAr}</p>
                      <p className="text-sm text-slate-500">{item.salePrice.toFixed(2)} ج.م للوحدة</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                        className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200"
                        aria-label="تقليل الكمية"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.id, Math.max(1, Number(e.target.value || 1)))}
                        className="h-10 w-20 rounded-lg border border-slate-200 px-2 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                        className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200"
                        aria-label="زيادة الكمية"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-bold text-[#006c4a]">الإجمالي: {item.lineTotal.toFixed(2)} ج.م</p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="min-h-[40px] rounded-lg bg-red-50 px-3 text-sm font-bold text-red-700"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>المجموع الفرعي</span>
                <span>{totals.subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm text-slate-600">
                <span>الضريبة</span>
                <span>{totals.tax.toFixed(2)} ج.م</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-lg font-black text-[#006c4a]">
                <span>الإجمالي</span>
                <span>{totals.total.toFixed(2)} ج.م</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/checkout" className="min-h-[44px] rounded-xl bg-[#006c4a] px-5 text-white font-bold flex items-center">
                  متابعة الدفع وإدخال العنوان
                </Link>
                <Link href="/" className="min-h-[44px] rounded-xl bg-[#e8f3ee] px-5 text-[#006c4a] font-bold flex items-center">
                  إضافة منتجات أخرى
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
