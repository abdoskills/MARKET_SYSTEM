"use client";

import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { useUIStore } from "@/lib/store/uiStore";
import { savePendingOfflineOrder } from "@/lib/offline/indexeddb";
import { triggerOfflineSync } from "@/lib/offline/sync";

type CheckoutResponse = {
  ok: boolean;
  error?: string;
  details?: string;
  message?: string;
  retryable?: boolean;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    paidAmount: number;
    changeAmount: number;
    createdAt: string;
    paymentMethod: "CASH" | "CARD";
    phone: string | null;
  };
  receipt?: {
    id: string;
    receiptNumber: string;
    printableHtml: string;
    payload: {
      orderNumber: string;
      receiptNumber: string;
      phone: string | null;
      paymentMethod: "CASH" | "CARD";
      paidAmount: number;
      changeAmount: number;
      createdAt: string;
      items: Array<{ nameAr: string; quantity: number; unitPrice: number; lineTotal: number }>;
      subtotal: number;
      discountAmount?: number;
      tax: number;
      total: number;
    };
  };
};

export default function CartDrawer() {
  const open = useUIStore((state) => state.isCartOpen);
  const closeCart = useUIStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const totals = useCartStore((state) => state.totals);
  const clearCart = useCartStore((state) => state.clearCart);
  const replaceCart = useCartStore((state) => state.replaceCart);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const [mounted, setMounted] = useState(false);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Load saved client profile from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProfile = localStorage.getItem("client_profile");
      if (savedProfile) {
        try {
          const { phone, address } = JSON.parse(savedProfile);
          if (phone) setPhone(phone);
          if (address) setAddress(address);
        } catch {}
      }
    }
  }, []);

  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null);

  const subtotal = useMemo(() => totals.subtotal.toFixed(2), [totals.subtotal]);
  const finalTotal = useMemo(() => Math.max(0, totals.total - promoDiscount), [totals.total, promoDiscount]);
  const parsedReceived = Number(receivedAmount || 0);
  const changeDue = Math.max(0, parsedReceived - finalTotal);
  const remainingDue = Math.max(0, finalTotal - parsedReceived);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = open || isCheckoutOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, isCheckoutOpen]);

  useEffect(() => {
    void triggerOfflineSync();
    const onOnline = () => {
      void triggerOfflineSync();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const resetCheckoutFlow = () => {
    setIsCheckoutOpen(false);
    setErrorMessage(null);
    setCheckoutResult(null);
    setPhone("");
    setAddress("");
    setPromoCode("");
    setPromoDiscount(0);
    setPromoError(null);
    setPaymentMethod("CASH");
    setReceivedAmount("");
    setIsSubmitting(false);
    setIsBackgroundSyncing(false);
    setIsOfflineSaved(false);
  };

  const handleOpenCheckout = () => {
    if (items.length === 0) return;
    setErrorMessage(null);
    setCheckoutResult(null);
    setPromoError(null);
    setIsCheckoutOpen(true);
  };

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

      const data = (await response.json()) as {
        ok?: boolean;
        discountAmount?: number;
      };

      if (!response.ok || !data.ok) {
        setPromoDiscount(0);
        setPromoError("الكود غير صالح أو منتهي.");
        return;
      }

      setPromoDiscount(Number(data.discountAmount ?? 0));
      setPromoError(null);
    } catch {
      setPromoError("تعذر التحقق من الكود الآن.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0 || isSubmitting) return;

    if (!phone.trim()) {
      setErrorMessage("رقم الهاتف مطلوب لإتمام الطلب.");
      return;
    }

    if (!address.trim()) {
      setErrorMessage("عنوان التوصيل مطلوب لإتمام الطلب.");
      return;
    }

    if (paymentMethod === "CASH") {
      if (!Number.isFinite(parsedReceived) || parsedReceived <= 0) {
        setErrorMessage("أدخل المبلغ المستلم من العميل.");
        return;
      }

      if (parsedReceived < finalTotal) {
        setErrorMessage("المبلغ المستلم أقل من الإجمالي المستحق.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const cartSnapshot = items.map((item) => ({ ...item }));
    const paidAmount = paymentMethod === "CASH" ? parsedReceived : finalTotal;
    const changeAmount = paymentMethod === "CASH" ? Math.max(0, paidAmount - finalTotal) : 0;

    setCheckoutResult({
      ok: true,
      order: {
        id: "pending",
        orderNumber: "SYNCING...",
        totalAmount: finalTotal,
        subtotal: totals.subtotal,
        taxAmount: totals.tax,
        discountAmount: promoDiscount,
        paidAmount,
        changeAmount,
        createdAt: new Date().toISOString(),
        paymentMethod,
        phone: phone.trim() || null,
      },
    });

      setIsBackgroundSyncing(true);
      setIsOfflineSaved(false);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "client_profile",
          JSON.stringify({ phone: phone.trim(), address: address.trim() })
        );
      }

      try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "ONLINE",
          phone: phone.trim(),
          address: address.trim(),
          promoCode: promoCode.trim(),
          paymentMethod,
          receivedAmount: paymentMethod === "CASH" ? parsedReceived : finalTotal,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || !data.ok) {
        if (response.status >= 500) {
          throw new Error(data.error ?? "SERVER_ERROR");
        }

        replaceCart(cartSnapshot);
        setCheckoutResult(null);
        setIsBackgroundSyncing(false);

        if (data.error === "INSUFFICIENT_STOCK") {
          setErrorMessage(`لا يوجد مخزون كافٍ للمنتج: ${data.details ?? "غير معروف"}`);
        } else if (data.error === "PRODUCT_NOT_FOUND") {
          setErrorMessage("أحد المنتجات لم يعد متاحاً حالياً. حدّث الصفحة وأعد المحاولة.");
        } else if (data.error === "INSUFFICIENT_RECEIVED") {
          setErrorMessage("المبلغ المستلم غير كافٍ لإتمام الدفع النقدي.");
        } else if (data.error === "TRANSACTION_CONFLICT") {
          setErrorMessage("يوجد ضغط على النظام الآن. حاول مرة أخرى خلال ثوانٍ.");
        } else if (data.error === "TOO_MANY_REQUESTS") {
          setErrorMessage("تم تجاوز عدد المحاولات المسموح. انتظر قليلاً ثم أعد المحاولة.");
        } else if (data.error === "INVALID_CODE" || data.error === "CODE_EXPIRED" || data.error === "CODE_INACTIVE") {
          setErrorMessage("كود الخصم غير صالح أو منتهي.");
        } else {
          setErrorMessage(data.message ? `تعذر إتمام الطلب: ${data.message}` : "فشل إتمام العملية. حاول مرة أخرى.");
        }
        return;
      }

      setCheckoutResult(data);
      clearCart();
      setIsBackgroundSyncing(false);
    } catch {
      const offlineOrderId = `offline-${Date.now()}`;
      savePendingOfflineOrder({
        phone: phone.trim(),
        address: address.trim(),
        promoCode: promoCode.trim(),
        channel: "ONLINE",
        paymentMethod,
        receivedAmount: paidAmount,
        items: cartSnapshot.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      setIsBackgroundSyncing(false);
      setIsOfflineSaved(true);
      clearCart();
      setCheckoutResult({
        ok: true,
        order: {
          id: offlineOrderId,
          orderNumber: `OFFLINE-${new Date().toISOString().slice(11, 19).replaceAll(":", "")}`,
          totalAmount: finalTotal,
          subtotal: totals.subtotal,
          taxAmount: totals.tax,
          discountAmount: promoDiscount,
          paidAmount,
          changeAmount,
          createdAt: new Date().toISOString(),
          paymentMethod,
          phone: phone.trim() || null,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    const html = checkoutResult?.receipt?.printableHtml;
    if (!html) return;
    const printWindow = window.open("", "_blank", "width=420,height=760");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownload = () => {
    const html = checkoutResult?.receipt?.printableHtml;
    const receiptNo = checkoutResult?.receipt?.receiptNumber;
    if (!html || !receiptNo) return;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${receiptNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 transition-all duration-200 ease-in-out ${
          open ? "pointer-events-auto bg-black/20 backdrop-blur-[2px]" : "pointer-events-none bg-transparent"
        }`}
        onClick={closeCart}
      >
        <aside
          className={`absolute left-0 top-0 h-full w-full max-w-md bg-[#fcf9f2] p-5 shadow-[-20px_0_40px_rgba(0,0,0,0.05)] transition-transform duration-200 ease-in-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-2xl font-black text-[#003527]">السلة الحالية</h3>
            <span className="text-[#a08f51] font-bold text-sm bg-[#f6f3ec] px-3 py-1 rounded-full">{items.length} عناصر</span>
            <button type="button" onClick={closeCart} className="rounded-lg bg-[#e5e2db] px-3 py-1 text-sm font-semibold text-[#003527]">
              إغلاق
            </button>
          </div>

          <div className="mb-6 space-y-4">
            {items.length === 0 ? (
              <p className="rounded-xl bg-white p-6 text-center text-sm font-bold text-[#404944] shadow-sm">لا توجد عناصر في السلة.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-[#f6f3ec] p-4 flex items-center gap-4 group rounded-none">
                  {/* Right - Image & Details */}
                  <div className="w-20 h-20 bg-white overflow-hidden rounded shadow-sm shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.nameAr} className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-[#003527]/20" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-serif text-lg font-bold text-[#1c1c18] leading-tight">{item.nameAr}</h3>
                    <p className="font-sans text-sm text-[#404944] mt-1">{item.unit || "قطعة"}</p>
                  </div>
                  
                  {/* Left - Price & Quantity */}
                  <div className="text-left shrink-0">
                    <p className="font-bold font-sans text-[#003527]">
                      {item.salePrice.toFixed(2)} ج.م
                    </p>
                    <div className="flex items-center justify-start gap-2 mt-1" dir="ltr">
                      <button 
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 border font-sans border-[#bfc9c3] rounded flex items-center justify-center text-xs hover:bg-[#e5e2db] transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold font-sans w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 border font-sans border-[#bfc9c3] rounded flex items-center justify-center text-xs hover:bg-[#e5e2db] transition-colors text-[#003527]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <section className="bg-white p-6 rounded-xl shadow-[0_4px_24px_rgba(28,28,24,0.06)] space-y-4 mb-4">
            <div className="flex justify-between items-center text-[#404944]">
              <span className="font-sans">المجموع الفرعي</span>
              <span className="font-medium font-sans">{subtotal} ر.س</span>
            </div>
            <div className="flex justify-between items-center text-[#404944]">
              <span className="font-sans">الضريبة (15%)</span>
              <span className="font-medium font-sans">{totals.tax.toFixed(2)} ر.س</span>
            </div>
            <div className="border-t border-dashed border-[#bfc9c3] my-4"></div>
            <div className="flex justify-between items-center text-xl font-bold text-[#003527]">
              <span className="font-serif">الإجمالي</span>
              <span className="font-sans">{finalTotal} ر.س</span>
            </div>
            <button
              type="button"
              onClick={handleOpenCheckout}
              disabled={items.length === 0}
              className="w-full mt-6 bg-[#003527] text-white py-5 rounded-lg flex items-center justify-center gap-3 hover:bg-[#064e3b] active:scale-[0.98] transition-transform shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>print</span>
              <span className="text-lg font-bold font-sans">الدفع والطباعة</span>
            </button>
          </section>
        </aside>
      </div>

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/30 p-4 backdrop-blur-sm" onClick={resetCheckoutFlow}>
          <div
            className="mx-auto my-4 max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 md:my-8 md:p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {!checkoutResult?.ok ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h4 className="font-display text-2xl font-black text-on-surface">إتمام الدفع</h4>
                  <button
                    type="button"
                    onClick={resetCheckoutFlow}
                    className="rounded-lg bg-surface-container-low px-3 py-1.5 text-sm font-semibold"
                  >
                    إغلاق
                  </button>
                </div>

                <div className="mb-5 rounded-2xl bg-surface-container-low p-4">
                  <p className="mb-3 text-sm font-bold text-on-surface">ملخص الطلب</p>
                  <div className="max-h-40 space-y-2 overflow-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-white p-2.5 text-sm">
                        <span className="font-semibold text-on-surface">{item.nameAr}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 rounded-md border border-surface-container text-xs"
                          >
                            -
                          </button>
                          <span className="text-secondary min-w-12 text-center">
                            {item.quantity} × {item.salePrice.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 rounded-md border border-surface-container text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-surface-container pt-3 text-sm">
                    <div className="flex items-center justify-between text-secondary">
                      <span>المجموع الفرعي</span>
                      <span>{totals.subtotal.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-secondary">
                      <span>الضريبة</span>
                      <span>{totals.tax.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-secondary">
                      <span>الخصم</span>
                      <span>-{promoDiscount.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between font-bold text-on-surface">
                      <span>الإجمالي</span>
                      <span className="text-lg text-primary">{finalTotal.toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-on-surface">رقم الهاتف *</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder="01xxxxxxxxx"
                      className="w-full rounded-xl border border-surface-container bg-surface-container-lowest px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-on-surface">عنوان التوصيل *</span>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="المدينة، الحي، الشارع، رقم المبنى"
                      className="w-full min-h-24 rounded-xl border border-surface-container bg-surface-container-lowest px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <div className="md:col-span-2 rounded-2xl border border-surface-container bg-surface-container-low p-3">
                    <p className="mb-2 text-sm font-bold text-on-surface">كود الخصم / العرض</p>
                    <div className="flex gap-2">
                      <input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="مثال: SAVE10"
                        className="w-full rounded-xl border border-surface-container bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={applyPromoCode}
                        disabled={promoLoading}
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {promoLoading ? "..." : "تطبيق"}
                      </button>
                    </div>
                    {promoError ? <p className="mt-2 text-xs font-semibold text-error">{promoError}</p> : null}
                  </div>

                  <fieldset>
                    <legend className="mb-2 block text-sm font-bold text-on-surface">نوع الدفع</legend>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CASH")}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                          paymentMethod === "CASH"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-surface-container bg-white text-secondary"
                        }`}
                      >
                        نقداً
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CARD")}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                          paymentMethod === "CARD"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-surface-container bg-white text-secondary"
                        }`}
                      >
                        بطاقة
                      </button>
                    </div>
                  </fieldset>
                </div>

                {paymentMethod === "CASH" && (
                  <div className="mb-4 rounded-2xl border border-surface-container bg-surface-container-low p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-on-surface">المبلغ المستلم</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        placeholder="200"
                        className="w-full rounded-xl border border-surface-container bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-white p-2.5">
                        <p className="text-secondary">المتبقي</p>
                        <p className="font-bold text-on-surface">{remainingDue.toFixed(2)} ج.م</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-2.5">
                        <p className="text-secondary">الفكة</p>
                        <p className="font-bold text-green-700">{changeDue.toFixed(2)} ج.م</p>
                      </div>
                    </div>
                  </div>
                )}

                {errorMessage && <p className="mb-4 rounded-xl bg-error/10 p-3 text-sm font-semibold text-error">{errorMessage}</p>}

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isSubmitting || items.length === 0}
                  className="w-full rounded-xl bg-gradient-to-l from-primary to-primary-container py-3 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "جاري تنفيذ الدفع..." : "تأكيد الدفع"}
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 flex flex-col items-center justify-center rounded-2xl bg-green-50 p-4 text-center">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✓</div>
                  <p className="text-lg font-black text-green-700">تم الدفع بنجاح</p>
                  <p className="mt-1 text-sm text-green-700/80">
                    {isBackgroundSyncing
                      ? "جاري مزامنة الطلب مع الخادم..."
                      : isOfflineSaved
                        ? "تم حفظ الطلب محلياً وسيتم رفعه تلقائياً عند عودة الإنترنت."
                        : "تم مسح السلة وجاهزة للعميل التالي."}
                  </p>
                </div>

                <div className="mb-4 rounded-2xl border border-surface-container bg-surface-container-low p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-on-surface">رقم الطلب</span>
                    <span className="font-mono text-primary">{checkoutResult.order?.orderNumber}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-on-surface">رقم الإيصال</span>
                    <span className="font-mono text-primary">{checkoutResult.receipt?.receiptNumber}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-on-surface">طريقة الدفع</span>
                    <span className="text-secondary">{checkoutResult.order?.paymentMethod === "CARD" ? "بطاقة" : "نقداً"}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-on-surface">الهاتف</span>
                    <span className="text-secondary">{checkoutResult.order?.phone ?? "-"}</span>
                  </div>
                  <div className="mt-3 border-t border-surface-container pt-3">
                    <div className="flex items-center justify-between text-sm text-secondary">
                      <span>المجموع الفرعي</span>
                      <span>{checkoutResult.order?.subtotal.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-secondary">
                      <span>الضريبة</span>
                      <span>{checkoutResult.order?.taxAmount.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-secondary">
                      <span>الخصم</span>
                      <span>{(checkoutResult.order?.discountAmount ?? 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-base font-black text-primary">
                      <span>الإجمالي</span>
                      <span>{checkoutResult.order?.totalAmount.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-secondary">
                      <span>المبلغ المستلم</span>
                      <span>{checkoutResult.order?.paidAmount.toFixed(2)} ج.م</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm font-bold text-green-700">
                      <span>الفكة</span>
                      <span>{checkoutResult.order?.changeAmount.toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={isBackgroundSyncing || !checkoutResult.receipt}
                    className="rounded-xl bg-surface-container-high px-4 py-2.5 text-sm font-bold text-on-surface"
                  >
                    طباعة
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isBackgroundSyncing || !checkoutResult.receipt}
                    className="rounded-xl bg-surface-container-high px-4 py-2.5 text-sm font-bold text-on-surface"
                  >
                    تنزيل
                  </button>
                  <button
                    type="button"
                    onClick={resetCheckoutFlow}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
                  >
                    طلب جديد
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
