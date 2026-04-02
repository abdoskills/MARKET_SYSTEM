"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionRole } from "@/lib/auth/session";
import { AnimatePresence, motion } from "framer-motion";
import { formatEgp } from "@/lib/format/locale";

type InventoryProduct = {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string | null;
  imageUrl: string | null;
  unit: string;
  salePrice: number;
  taxRatePercent: number;
  stockQty: number;
  lowStockThreshold: number;
  category: {
    id: string;
    slug: string;
    nameAr: string;
  } | null;
};

type ProductForm = {
  id?: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  imageUrl: string;
  unit: string;
  costPrice: string;
  salePrice: string;
  taxRatePercent: string;
  stockQty: string;
  lowStockThreshold: string;
};

const emptyForm: ProductForm = {
  sku: "",
  nameAr: "",
  nameEn: "",
  categoryId: "",
  imageUrl: "",
  unit: "pcs",
  costPrice: "0",
  salePrice: "0",
  taxRatePercent: "15",
  stockQty: "0",
  lowStockThreshold: "5",
};

export default function InventoryManager({ role }: { role: SessionRole }) {
  const canManageInventory = role === "ADMIN" || role === "MANAGER";
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; nameAr: string; slug: string }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nameAr: string } | null>(null);

  async function loadProducts(currentSearch = searchTerm) {
    try {
      setLoading(true);
      setError(null);
      const query = currentSearch.trim() ? `?q=${encodeURIComponent(currentSearch.trim())}&pageSize=100` : "?pageSize=100";
      const response = await fetch(`/api/products${query}`, { cache: "no-store" });
      const json = (await response.json()) as { data?: InventoryProduct[]; error?: string };
      if (!response.ok) throw new Error(json.error || "LOAD_FAILED");
      setProducts(json.data ?? []);
    } catch {
      setError("تعذر تحميل المنتجات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadProducts(searchTerm);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    loadProducts();
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadProducts(searchTerm);
    }, 12_000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  async function loadCategories() {
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      const json = (await response.json()) as { data?: Array<{ id: string; nameAr: string; slug: string }> };
      setCategories(json.data ?? []);
    } catch {
      setCategories([]);
    }
  }

  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter((p) => p.stockQty <= 0).length;
    const lowStock = products.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold).length;
    return { total, lowStock, outOfStock };
  }, [products]);

  function openAddForm() {
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(product: InventoryProduct) {
    setForm({
      id: product.id,
      sku: product.sku,
      nameAr: product.nameAr,
      nameEn: product.nameEn ?? "",
      categoryId: product.category?.id ?? "",
      imageUrl: product.imageUrl ?? "",
      unit: product.unit,
      costPrice: "0",
      salePrice: String(product.salePrice),
      taxRatePercent: String(product.taxRatePercent),
      stockQty: String(product.stockQty),
      lowStockThreshold: String(product.lowStockThreshold),
    });
    setShowForm(true);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        sku: form.sku,
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        categoryId: form.categoryId,
        imageUrl: form.imageUrl,
        unit: form.unit,
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        taxRatePercent: Number(form.taxRatePercent),
        stockQty: Number(form.stockQty),
        lowStockThreshold: Number(form.lowStockThreshold),
      };

      const isEdit = Boolean(form.id);
      const response = await fetch(isEdit ? `/api/products/${form.id}` : "/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "SAVE_FAILED");

      setShowForm(false);
      setForm(emptyForm);
      await loadProducts();
    } catch {
      setError("تعذر حفظ المنتج.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {

    try {
      setError(null);
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "DELETE_FAILED");
      setDeleteTarget(null);
      await loadProducts();
    } catch {
      setError("تعذر حذف المنتج.");
    }
  }

  function requestDelete(product: InventoryProduct) {
    setDeleteTarget({ id: product.id, nameAr: product.nameAr });
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] p-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#191c1e]">إدارة المنتجات والمخزون</h1>
              <p className="text-sm text-slate-500 mt-1">إضافة / تعديل / حذف منتجات مع تنبيه المخزون المنخفض.</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-[#006c4a]/20 focus:border-[#006c4a]"
                  placeholder="بحث بالاسم أو SKU"
                />
              </div>
              <button
                disabled={!canManageInventory}
                onClick={openAddForm}
                className="rounded-xl bg-[#006c4a] px-4 py-2 text-sm font-bold text-white hover:bg-[#005137] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + إضافة منتج
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CardStat title="إجمالي المنتجات" value={stats.total} tone="emerald" />
          <CardStat title="منخفض المخزون" value={stats.lowStock} tone="amber" />
          <CardStat title="نفذ من المخزون" value={stats.outOfStock} tone="red" />
        </section>

        {error && <p className="text-sm font-semibold text-[#ba1a1a]">{error}</p>}

        {showForm && canManageInventory && (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <h2 className="font-bold mb-4 text-[#191c1e]">{form.id ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
            <form onSubmit={submitForm} className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="SKU" value={form.sku} onChange={(value) => setForm((s) => ({ ...s, sku: value }))} required />
              <Field label="اسم المنتج (عربي)" value={form.nameAr} onChange={(value) => setForm((s) => ({ ...s, nameAr: value }))} required />
              <Field label="اسم المنتج (EN)" value={form.nameEn} onChange={(value) => setForm((s) => ({ ...s, nameEn: value }))} />
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                <span className="text-xs font-semibold text-slate-500">النوع / الفئة</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-[#006c4a] focus:ring-2 focus:ring-[#006c4a]/20"
                >
                  <option value="">بدون فئة</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="صورة URL" value={form.imageUrl} onChange={(value) => setForm((s) => ({ ...s, imageUrl: value }))} />
              <Field label="الوحدة" value={form.unit} onChange={(value) => setForm((s) => ({ ...s, unit: value }))} />
              <Field label="سعر التكلفة" type="number" value={form.costPrice} onChange={(value) => setForm((s) => ({ ...s, costPrice: value }))} />
              <Field label="سعر البيع" type="number" value={form.salePrice} onChange={(value) => setForm((s) => ({ ...s, salePrice: value }))} required />
              <Field label="الضريبة %" type="number" value={form.taxRatePercent} onChange={(value) => setForm((s) => ({ ...s, taxRatePercent: value }))} />
              <Field label="الكمية" type="number" value={form.stockQty} onChange={(value) => setForm((s) => ({ ...s, stockQty: value }))} />
              <Field label="حد التنبيه" type="number" value={form.lowStockThreshold} onChange={(value) => setForm((s) => ({ ...s, lowStockThreshold: value }))} />

              <div className="md:col-span-3 flex gap-3 pt-2">
                <button disabled={saving} className="rounded-xl bg-[#006c4a] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">المنتج</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">السعر</th>
                  <th className="px-4 py-3">الكمية</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>جاري تحميل المنتجات...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>لا توجد منتجات.</td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const isOut = product.stockQty <= 0;
                    const isLow = !isOut && product.stockQty <= product.lowStockThreshold;

                    return (
                      <tr key={product.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                              {product.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.imageUrl} alt={product.nameAr} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-lg">🥛</div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#191c1e]">{product.nameAr}</p>
                              <p className="text-xs text-slate-500">{product.category?.nameAr ?? "بدون تصنيف"} • {product.unit}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{product.sku}</td>
                        <td className="px-4 py-3 text-sm font-bold">{formatEgp(product.salePrice)}</td>
                        <td className="px-4 py-3 text-sm">{product.stockQty.toFixed(3)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              isOut
                                ? "bg-[#ffdad6] text-[#93000a]"
                                : isLow
                                  ? "bg-[#fce8b2] text-[#855300]"
                                  : "bg-[#d7f5e8] text-[#00513a]"
                            }`}
                          >
                            {isOut ? "نفذ" : isLow ? "منخفض" : "متوفر"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canManageInventory ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditForm(product)}
                                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => requestDelete(product)}
                                className="rounded-lg bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#93000a]"
                              >
                                حذف
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">عرض فقط</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px] p-4"
              onClick={() => setDeleteTarget(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="mx-auto mt-28 max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-black text-[#191c1e]">تأكيد حذف المنتج</h3>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">Danger</span>
                </div>
                <p className="text-sm text-slate-600 leading-6">
                  هل أنت متأكد من حذف <span className="font-bold text-[#191c1e]">{deleteTarget.nameAr}</span>؟
                  <br />
                  لا يمكن التراجع بعد تنفيذ العملية.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="min-h-[44px] rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProduct(deleteTarget.id)}
                    className="min-h-[44px] rounded-xl bg-red-600 text-white font-bold hover:bg-red-700"
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CardStat({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-3xl font-black text-[#191c1e]">{value}</p>
        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${toneClasses}`}>Live</span>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#006c4a]/20 focus:border-[#006c4a]"
      />
    </label>
  );
}
