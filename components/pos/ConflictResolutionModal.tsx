"use client";

import { useMemo, useState } from "react";
import { type OfflineCheckoutOrder, resolveConflictKeepLocal, resolveConflictKeepServer, resolveConflictMergeManual } from "@/lib/offline/indexeddb";

type Props = {
  order: OfflineCheckoutOrder;
  onClose: () => void;
  onResolved: () => void;
};

export default function ConflictResolutionModal({ order, onClose, onResolved }: Props) {
  const [manual, setManual] = useState(false);

  const editableItems = useMemo(
    () => (order.payload.items ?? []).map((item) => ({ productId: item.productId, quantity: Number(item.quantity ?? 0) })),
    [order.payload.items],
  );
  const [items, setItems] = useState(editableItems);

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 p-4" dir="rtl">
      <div className="mx-auto mt-10 w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-[#191c1e]">Data Sync Required</h3>
            <p className="text-xs text-slate-500">يوجد تعارض في مزامنة الطلب المحلي مع السيرفر.</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">إغلاق</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-2 text-xs font-bold text-slate-500">Local Order</p>
            <p className="text-xs text-slate-600">Local ID: {order.localId}</p>
            <p className="mt-1 text-xs text-slate-600">خطأ: {order.lastError ?? "-"}</p>
            <ul className="mt-3 space-y-2">
              {(order.payload.items ?? []).map((item, idx) => (
                <li key={`${item.productId}-${idx}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  {item.productId} × {item.quantity}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-2 text-xs font-bold text-slate-500">Server State</p>
            <p className="text-xs text-slate-600">لا توجد نسخة محفوظة من السيرفر لهذا الطلب (محلي فقط).</p>
            <p className="mt-2 text-xs text-slate-600">اختر إحدى استراتيجيات الحل أدناه.</p>
          </div>
        </div>

        {manual && (
          <div className="mt-4 rounded-xl border border-[#006c4a]/20 bg-[#e8f3ee] p-4">
            <p className="mb-2 text-xs font-bold text-[#006c4a]">Merge Manual</p>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="grid grid-cols-[1fr_120px] gap-2">
                  <input
                    value={item.productId ?? ""}
                    onChange={(event) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], productId: event.target.value };
                      setItems(next);
                    }}
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(event) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], quantity: Number(event.target.value) };
                      setItems(next);
                    }}
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <button
            onClick={() => {
              resolveConflictKeepLocal(order.localId);
              onResolved();
            }}
            className="min-h-[44px] rounded-xl bg-[#006c4a] px-4 text-sm font-bold text-white"
          >
            Keep Local
          </button>
          <button
            onClick={() => {
              resolveConflictKeepServer(order.localId);
              onResolved();
            }}
            className="min-h-[44px] rounded-xl bg-[#ffdad6] px-4 text-sm font-bold text-[#93000a]"
          >
            Keep Server
          </button>
          <button
            onClick={() => {
              if (!manual) {
                setManual(true);
                return;
              }

              resolveConflictMergeManual(
                order.localId,
                items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                })),
              );
              onResolved();
            }}
            className="min-h-[44px] rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
          >
            {manual ? "Save Merge" : "Merge Manual"}
          </button>
        </div>
      </div>
    </div>
  );
}
