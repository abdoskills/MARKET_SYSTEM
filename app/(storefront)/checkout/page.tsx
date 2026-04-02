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
    changeAmount?: number;
  };
  walletUpdate?: {
    addedAmount: number;
    newBalance: number;
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
  const [mounted, setMounted] = useState(false);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isPosMode, setIsPosMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH">("CARD");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [addChangeToWallet, setAddChangeToWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderNo, setSuccessOrderNo] = useState<string | null>(null);
  const [successReceiptNo, setSuccessReceiptNo] = useState<string | null>(null);
  const [successReceiptHtml, setSuccessReceiptHtml] = useState<string | null>(null);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);

  const finalTotal = Math.max(0, totals.total - promoDiscount);

  const parsedReceivedAmount = useMemo(() => {
    const numeric = Number(receivedAmount || 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }, [receivedAmount]);

  const changeAmount = useMemo(() => {
    if (!isPosMode || paymentMethod !== "CASH") return 0;
    return Math.max(0, parsedReceivedAmount - finalTotal);
  }, [finalTotal, isPosMode, parsedReceivedAmount, paymentMethod]);

  const canSubmit = useMemo(() => {
    if (submitting || items.length === 0) return false;
    if (isPosMode) {
      if (paymentMethod === "CARD") return true;
      return parsedReceivedAmount >= finalTotal;
    }

    return phone.trim().length >= 8 && address.trim().length >= 5;
  }, [address, finalTotal, isPosMode, items.length, parsedReceivedAmount, paymentMethod, phone, submitting]);

  useEffect(() => {
    setPromoDiscount(0);
    setPromoError(null);
  }, [totals.subtotal]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const posMode = mode === "pos";
    setIsPosMode(posMode);
    setPaymentMethod(posMode ? "CASH" : "CARD");
  }, []);

  useEffect(() => setMounted(true), []);

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
    if (!isPosMode) {
      if (!phone.trim()) {
        setError("رقم الهاتف مطلوب لإتمام الطلب.");
        return;
      }
      if (!address.trim()) {
        setError("عنوان التوصيل مطلوب لإتمام الطلب.");
        return;
      }
    } else if (paymentMethod === "CASH" && parsedReceivedAmount < finalTotal) {
      setError("المبلغ المستلم أقل من إجمالي الفاتورة.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setWalletMessage(null);

    try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: isPosMode ? "POS" : "ONLINE",
          phone: !isPosMode ? phone.trim() || undefined : undefined,
          address: !isPosMode ? address.trim() : undefined,
          promoCode: promoCode.trim() || undefined,
          paymentMethod,
          receivedAmount: paymentMethod === "CASH" ? parsedReceivedAmount : finalTotal,
          addChangeToWallet: isPosMode ? addChangeToWallet : false,
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
      if (data.walletUpdate) {
        setWalletMessage(
          `تمت إضافة ${data.walletUpdate.addedAmount.toFixed(2)} ج.م للمحفظة. الرصيد الجديد ${data.walletUpdate.newBalance.toFixed(2)} ج.م`,
        );
      }
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

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-white p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-black text-[#003527] mb-6 font-serif tracking-tight">{isPosMode ? "إتمام طلب نقطة البيع" : "إتمام الطلب"}</h1>

        {successOrderNo ? (
          <div className="rounded-3xl border-none bg-white/80 backdrop-blur-xl p-8 shadow-ambient">
            <p className="text-lg font-black text-[#003527]">تم إنشاء الطلب بنجاح ✅</p>
            <p className="mt-2 text-slate-700">رقم الطلب: {successOrderNo}</p>
            {successReceiptNo ? <p className="mt-1 text-slate-700">رقم الإيصال: {successReceiptNo}</p> : null}
            {walletMessage ? <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{walletMessage}</p> : null}
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
              <Link href="/" className="inline-flex min-h-[44px] items-center rounded-xl bg-[#003527] px-4 text-white font-bold">
                العودة للرئيسية
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border-none bg-white/80 backdrop-blur-xl p-8 shadow-ambient">
            <p className="text-slate-600">لا توجد عناصر في السلة.</p>
            <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#003527] px-4 text-white font-bold">
              ابدأ التسوق
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-3xl border-none bg-white/80 backdrop-blur-xl p-6 shadow-ambient">
              <h2 className="text-xl font-bold font-serif tracking-tight text-[#003527] mb-5">{isPosMode ? "الدفع" : "العنوان والتواصل"}</h2>

              {isPosMode ? (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`rounded-xl px-3 py-2 font-bold ${paymentMethod === "CASH" ? "bg-[#003527] text-white" : "bg-white text-slate-700"}`}
                    >
                      نقداً
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("CARD");
                        setAddChangeToWallet(false);
                      }}
                      className={`rounded-xl px-3 py-2 font-bold ${paymentMethod === "CARD" ? "bg-[#003527] text-white" : "bg-white text-slate-700"}`}
                    >
                      بطاقة
                    </button>
                  </div>

                  {paymentMethod === "CASH" ? (
                    <>
                      <label className="mb-2 block">
                        <span className="mb-1 block text-sm font-semibold text-slate-700">المبلغ المستلم</span>
                        <input
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(e.target.value)}
                          inputMode="decimal"
                          className="w-full min-h-[48px] bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]"
                          placeholder="0.00"
                        />
                      </label>

                      <p className="mb-2 text-sm font-semibold text-slate-600">الفكة المتوقعة: {changeAmount.toFixed(2)} ج.م</p>

                      {changeAmount > 0 ? (
                        <label className="flex items-center gap-2 rounded-xl bg-amber-50 p-3">
                          <input
                            type="checkbox"
                            checked={addChangeToWallet}
                            onChange={(e) => setAddChangeToWallet(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm font-bold text-amber-900">إضافة الفكة للمحفظة</span>
                        </label>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <label className="mb-3 block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">رقم الهاتف *</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full min-h-[48px] bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]"
                      placeholder="01xxxxxxxxx"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">عنوان التوصيل *</span>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full min-h-[120px] bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 py-3 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3] resize-none"
                      placeholder="المدينة، الحي، الشارع، رقم المبنى، رقم الشقة"
                    />
                  </label>
                </>
              )}

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-700">كود الخصم / العرض</p>
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="مثال: SAVE10"
                    className="min-h-[48px] flex-1 bg-surface-container-lowest text-[#1c1c18] rounded-xl border border-[#e5e2db] px-4 outline-none focus:border-[#003527] focus:ring-1 focus:ring-[#003527] transition-all font-sans placeholder:text-[#bfc9c3]"
                  />
                  <button
                    type="button"
                    onClick={applyPromoCode}
                    disabled={promoLoading}
                    className="min-h-[48px] rounded-xl bg-[#003527] px-6 text-white font-bold disabled:opacity-60 shadow-md hover:bg-[#064e3b] active:scale-[0.98] transition-all font-sans"
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
                className="mt-4 w-full min-h-[48px] rounded-xl bg-[#003527] text-white font-bold disabled:opacity-60 shadow-md hover:bg-[#064e3b] active:scale-[0.98] transition-all font-sans"
              >
                {submitting ? "جاري تأكيد الطلب..." : "تأكيد الطلب"}
              </button>
            </section>

            <section className="rounded-3xl border-none bg-white/80 backdrop-blur-xl p-6 shadow-ambient">
              <h2 className="text-xl font-bold font-serif tracking-tight text-[#003527] mb-5">ملخص الطلب</h2>

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
                <div className="mt-2 flex items-center justify-between text-lg font-black text-[#003527]">
                  <span>الإجمالي</span>
                  <span>{finalTotal.toFixed(2)} ج.م</span>
                </div>
                {isPosMode && paymentMethod === "CASH" ? (
                  <>
                    <div className="mt-1 flex items-center justify-between text-slate-600">
                      <span>المستلم</span>
                      <span>{parsedReceivedAmount.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-slate-600">
                      <span>الفكة</span>
                      <span>{changeAmount.toFixed(2)} ج.م</span>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
