"use client";

import { useEffect, useState } from "react";

type Offer = {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  isActive: boolean;
  expiresAt: string | null;
};

export default function OffersManager() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("10");
  const [expiresAt, setExpiresAt] = useState("");

  async function loadOffers() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/offers", { cache: "no-store" });
      const json = (await res.json()) as { ok?: boolean; data?: Offer[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "LOAD_FAILED");
      setOffers(json.data ?? []);
    } catch {
      setError("تعذر تحميل العروض.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffers();
  }, []);

  async function createOffer(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          kind,
          value: Number(value),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          isActive: true,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "CREATE_FAILED");

      setCode("");
      setValue("10");
      setKind("PERCENT");
      setExpiresAt("");
      await loadOffers();
    } catch {
      setError("تعذر حفظ كود الخصم.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOffer(offer: Offer) {
    try {
      setError(null);
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "UPDATE_FAILED");
      await loadOffers();
    } catch {
      setError("تعذر تحديث حالة الكود.");
    }
  }

  return (
    <section className="p-6" dir="rtl">
      <h1 className="text-2xl font-black text-[#191c1e]">أكواد العروض والخصم</h1>
      <p className="mt-1 text-sm text-slate-500">أنشئ كود خصم يعمل في صفحة الدفع حتى تاريخ انتهاء الصلاحية.</p>

      <form onSubmit={createOffer} className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-5">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          placeholder="CODE10"
          className="min-h-[44px] rounded-xl border border-slate-200 px-3"
        />

        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "PERCENT" | "FIXED")}
          className="min-h-[44px] rounded-xl border border-slate-200 px-3"
        >
          <option value="PERCENT">نسبة %</option>
          <option value="FIXED">قيمة ثابتة</option>
        </select>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          type="number"
          min="0.01"
          step="0.01"
          placeholder="10"
          className="min-h-[44px] rounded-xl border border-slate-200 px-3"
        />

        <input
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          type="datetime-local"
          className="min-h-[44px] rounded-xl border border-slate-200 px-3"
        />

        <button
          disabled={saving}
          className="min-h-[44px] rounded-xl bg-[#006c4a] px-4 text-white font-bold disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "إضافة العرض"}
        </button>
      </form>

      {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid grid-cols-5 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
          <div>الكود</div>
          <div>النوع</div>
          <div>القيمة</div>
          <div>تاريخ الانتهاء</div>
          <div>الحالة</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">جارٍ التحميل...</div>
        ) : offers.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">لا توجد أكواد بعد.</div>
        ) : (
          offers.map((offer) => (
            <div key={offer.id} className="grid grid-cols-5 items-center border-t border-slate-100 px-4 py-3 text-sm">
              <div className="font-bold text-[#191c1e]">{offer.code}</div>
              <div>{offer.kind === "PERCENT" ? "نسبة" : "ثابت"}</div>
              <div>{offer.value}</div>
              <div>{offer.expiresAt ? new Date(offer.expiresAt).toLocaleString("ar-EG") : "بدون انتهاء"}</div>
              <div>
                <button
                  type="button"
                  onClick={() => toggleOffer(offer)}
                  className={`min-h-[36px] rounded-lg px-3 text-xs font-bold ${
                    offer.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {offer.isActive ? "مفعّل (اضغط للإيقاف)" : "متوقف (اضغط للتفعيل)"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
