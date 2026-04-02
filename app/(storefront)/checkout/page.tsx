"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cartStore";

type CheckoutApiResponse = {
  ok: boolean;
  error?: string;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number;
  };
  receipt?: {
    receiptNumber: string;
    printableHtml: string;
  };
};

type PromoValidateResponse =
  | { ok: true; code: string; kind: "PERCENT" | "FIXED"; value: number; discountAmount: number }
  | { ok: false; error?: string; discountAmount?: number };

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const totals = useCartStore((state) => state.totals);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderNo, setSuccessOrderNo] = useState<string | null>(null);
  const [successReceiptNo, setSuccessReceiptNo] = useState<string | null>(null);
  const [successReceiptHtml, setSuccessReceiptHtml] = useState<string | null>(null);

  const finalTotal = Math.max(0, totals.total - promoDiscount);

  const canSubmit = useMemo(
    () => items.length > 0 && phone.trim().length >= 8 && address.trim().length >= 5 && !submitting,
    [items.length, phone, address, submitting],
  );

  useEffect(() => {
    setPromoDiscount(0);
    setPromoError(null);
  }, [totals.subtotal]);

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError("اكتب كود الخصم أولاً.");
      return;
    }

    try {
      setPromoLoading(true);
      setPromoError(null);
      const response = await fetch("/api/offers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode.trim(),
          subtotal: totals.subtotal,
        }),
      });

      const data = (await response.json()) as PromoValidateResponse;
      if (!response.ok || !data.ok) {
        setPromoDiscount(0);
        setPromoError("الكود غير صالح أو منتهي.");
        return;
      }

      setPromoDiscount(Number(data.discountAmount || 0));
      setPromoError(null);
    } catch {
      setPromoError("تعذر التحقق من الكود الآن.");
    } finally {
      setPromoLoading(false);
    }
  };

  const submitOrder = async () => {
    if (!canSubmit) return;
    if (!phone.trim()) {
      setError("رقم الهاتف مطلوب لإتمام الطلب.");
      return;
    }
    if (!address.trim()) {
      setError("عنوان التوصيل مطلوب لإتمام الطلب.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "ONLINE",
          phone: phone.trim() || undefined,
          address: address.trim(),
          promoCode: promoCode.trim() || undefined,
          paymentMethod: "CARD",
          receivedAmount: finalTotal,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = (await response.json()) as CheckoutApiResponse;

      if (!response.ok || !data.ok) {
        if (data.error === "INSUFFICIENT_STOCK") {
          setError("بعض المنتجات نفدت من المخزون. حدّث الكمية وحاول مرة أخرى.");
        } else if (data.error === "INVALID_CODE" || data.error === "CODE_EXPIRED" || data.error === "CODE_INACTIVE") {
          setError("كود الخصم غير صالح أو منتهي. جرّب كودًا آخر.");
        } else {
          setError("فشل تأكيد الطلب. حاول مرة أخرى.");
        }
        return;
      }

      clearCart();
      setSuccessOrderNo(data.order?.orderNumber ?? "");
      setSuccessReceiptNo(data.receipt?.receiptNumber ?? null);
      setSuccessReceiptHtml(data.receipt?.printableHtml ?? null);
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceipt = () => {
    if (!successReceiptHtml || !successReceiptNo) return;
    const blob = new Blob([successReceiptHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${successReceiptNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReceipt = () => {
    if (!successReceiptHtml) return;
    const win = window.open("", "_blank", "width=420,height=760");
    if (!win) return;
    win.document.open();
    win.document.write(successReceiptHtml);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <main className="min-h-screen bg-[#f7f9fb] p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-2xl font-black text-[#006c4a]">إتمام الطلب</h1>

        {successOrderNo ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-lg font-black text-[#006c4a]">تم إنشاء الطلب بنجاح ✅</p>
            <p className="mt-2 text-slate-700">رقم الطلب: {successOrderNo}</p>
            {successReceiptNo ? <p className="mt-1 text-slate-700">رقم الإيصال: {successReceiptNo}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadReceipt}
                disabled={!successReceiptHtml || !successReceiptNo}
                className="min-h-[44px] rounded-xl bg-slate-100 px-4 font-bold text-slate-800 disabled:opacity-60"
              >
                تنزيل الإيصال
              </button>
              <button
                type="button"
                onClick={printReceipt}
                disabled={!successReceiptHtml}
                className="min-h-[44px] rounded-xl bg-slate-100 px-4 font-bold text-slate-800 disabled:opacity-60"
              >
                طباعة الإيصال
              </button>
              <Link href="/" className="inline-flex min-h-[44px] items-center rounded-xl bg-[#006c4a] px-4 text-white font-bold">
                العودة للرئيسية
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-slate-600">لا توجد عناصر في السلة.</p>
            <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#006c4a] px-4 text-white font-bold">
              ابدأ التسوق
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-black text-slate-900">العنوان والتواصل</h2>

              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">رقم الهاتف *</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3"
                  placeholder="01xxxxxxxxx"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">عنوان التوصيل *</span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="المدينة، الحي، الشارع، رقم المبنى، رقم الشقة"
                />
              </label>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-700">كود الخصم / العرض</p>
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="مثال: SAVE10"
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-200 px-3"
                  />
                  <button
                    type="button"
                    onClick={applyPromoCode}
                    disabled={promoLoading}
                    className="min-h-[44px] rounded-xl bg-[#006c4a] px-4 text-white font-bold disabled:opacity-60"
                  >
                    {promoLoading ? "..." : "تطبيق"}
                  </button>
                </div>
                {promoDiscount > 0 ? (
                  <p className="mt-2 text-sm font-bold text-emerald-700">تم تطبيق الخصم: -{promoDiscount.toFixed(2)} ج.م</p>
                ) : null}
                {promoError ? <p className="mt-2 text-sm font-semibold text-red-700">{promoError}</p> : null}
              </div>

              {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

              <button
                type="button"
                onClick={submitOrder}
                disabled={!canSubmit}
                className="mt-4 w-full min-h-[44px] rounded-xl bg-[#006c4a] text-white font-bold disabled:opacity-60"
              >
                {submitting ? "جاري تأكيد الطلب..." : "تأكيد الطلب"}
              </button>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-black text-slate-900">ملخص الطلب</h2>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800">{item.nameAr}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.lineTotal.toFixed(2)} ج.م</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>المجموع الفرعي</span>
                  <span>{totals.subtotal.toFixed(2)} ج.م</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-600">
                  <span>الضريبة</span>
                  <span>{totals.tax.toFixed(2)} ج.م</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-600">
                  <span>الخصم</span>
                  <span>-{promoDiscount.toFixed(2)} ج.م</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-lg font-black text-[#006c4a]">
                  <span>الإجمالي</span>
                  <span>{finalTotal.toFixed(2)} ج.م</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
