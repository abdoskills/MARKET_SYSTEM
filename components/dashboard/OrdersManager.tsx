"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEgp } from "@/lib/format/locale";

type BoardOrder = {
  id: string;
  orderNumber: string;
  channel: "ONLINE" | "POS";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "REFUNDED";
  totalAmount: number;
  createdAt: string;
  customerName: string;
  customerPhone: string | null;
  addressLine: string | null;
};

type OrdersBoard = {
  pending: BoardOrder[];
  inProgress: BoardOrder[];
  completed: BoardOrder[];
  canceled: BoardOrder[];
};

const emptyBoard: OrdersBoard = {
  pending: [],
  inProgress: [],
  completed: [],
  canceled: [],
};

export default function OrdersManager() {
  const [board, setBoard] = useState<OrdersBoard>(emptyBoard);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  async function loadBoard(currentSearch = searchTerm) {
    try {
      setLoading(true);
      setError(null);
      const query = currentSearch.trim() ? `?q=${encodeURIComponent(currentSearch.trim())}` : "";
      const response = await fetch(`/api/orders${query}`, { cache: "no-store" });
      const json = (await response.json()) as { data?: OrdersBoard; error?: string };
      if (!response.ok) throw new Error(json.error || "LOAD_ORDERS_FAILED");
      setBoard(json.data ?? emptyBoard);
    } catch {
      setError("تعذر تحميل الطلبات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadBoard(searchTerm);
    }, 120);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadBoard(searchTerm);
    }, 6_000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const activeCount = useMemo(
    () => board.pending.length + board.inProgress.length,
    [board.pending.length, board.inProgress.length],
  );

  async function updateStatus(orderId: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED") {
    if (updatingOrderId) return;

    const prevBoard = board;
    const movedOrder =
      board.pending.find((o) => o.id === orderId) ??
      board.inProgress.find((o) => o.id === orderId) ??
      board.completed.find((o) => o.id === orderId) ??
      board.canceled.find((o) => o.id === orderId);

    if (!movedOrder) return;

    const nextOrder = { ...movedOrder, status };
    const withoutOrder = {
      pending: board.pending.filter((o) => o.id !== orderId),
      inProgress: board.inProgress.filter((o) => o.id !== orderId),
      completed: board.completed.filter((o) => o.id !== orderId),
      canceled: board.canceled.filter((o) => o.id !== orderId),
    };

    const optimisticBoard: OrdersBoard = {
      pending: status === "PENDING" ? [nextOrder, ...withoutOrder.pending] : withoutOrder.pending,
      inProgress: status === "IN_PROGRESS" ? [nextOrder, ...withoutOrder.inProgress] : withoutOrder.inProgress,
      completed: status === "COMPLETED" ? [nextOrder, ...withoutOrder.completed] : withoutOrder.completed,
      canceled: status === "CANCELED" ? [nextOrder, ...withoutOrder.canceled] : withoutOrder.canceled,
    };

    try {
      setUpdatingOrderId(orderId);
      setError(null);
      setBoard(optimisticBoard);

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "UPDATE_STATUS_FAILED");
      void loadBoard(searchTerm);
    } catch {
      setBoard(prevBoard);
      setError("تعذر تحديث حالة الطلب.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#191c1e]">إدارة الطلبات</h1>
              <p className="text-sm text-slate-500 mt-1">تحديث حالة الطلب (جاري - تم - ملغي) + بيانات العميل والعنوان.</p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              <span className="rounded-full bg-[#d5e3fd] px-3 py-1 text-xs font-bold text-[#006c4a]">{activeCount} طلب نشط</span>
              <div className="relative w-full sm:w-80">
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-[#006c4a]/20 focus:border-[#006c4a]"
                  placeholder="بحث برقم الطلب أو العميل"
                />
              </div>
            </div>
          </div>
        </header>

        {error && <p className="text-sm font-semibold text-[#ba1a1a]">{error}</p>}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <OrderColumn
            title="طلبات جديدة"
            color="red"
            orders={board.pending}
            loading={loading}
            actions={(order, isUpdating) => (
              <button
                onClick={() => updateStatus(order.id, "IN_PROGRESS")}
                disabled={isUpdating}
                className="min-h-[38px] rounded-xl bg-gradient-to-l from-[#006c4a] to-[#2f9a79] px-3 py-1 text-xs font-bold text-white shadow-sm disabled:opacity-60"
              >
                {isUpdating ? "جاري..." : "بدء التجهيز"}
              </button>
            )}
            updatingOrderId={updatingOrderId}
          />
          <OrderColumn
            title="قيد التجهيز"
            color="amber"
            orders={board.inProgress}
            loading={loading}
            actions={(order, isUpdating) => (
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(order.id, "COMPLETED")}
                  disabled={isUpdating}
                  className="min-h-[38px] rounded-xl bg-gradient-to-l from-[#006c4a] to-[#2f9a79] px-3 py-1 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                >
                  {isUpdating ? "جاري..." : "تم التسليم"}
                </button>
                <button
                  onClick={() => updateStatus(order.id, "CANCELED")}
                  disabled={isUpdating}
                  className="min-h-[38px] rounded-xl border border-[#ffb4ab] bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#93000a] disabled:opacity-60"
                >
                  {isUpdating ? "جاري..." : "إلغاء"}
                </button>
              </div>
            )}
            updatingOrderId={updatingOrderId}
          />
          <OrderColumn title="مكتمل" color="emerald" orders={board.completed} loading={loading} updatingOrderId={updatingOrderId} />
          <OrderColumn title="ملغي" color="slate" orders={board.canceled} loading={loading} updatingOrderId={updatingOrderId} />
        </section>
      </div>
    </div>
  );
}

function OrderColumn({
  title,
  color,
  orders,
  loading,
  actions,
  updatingOrderId,
}: {
  title: string;
  color: "red" | "amber" | "emerald" | "slate";
  orders: BoardOrder[];
  loading: boolean;
  actions?: (order: BoardOrder, isUpdating: boolean) => React.ReactNode;
  updatingOrderId: string | null;
}) {
  const colorDot =
    color === "red"
      ? "bg-[#ba1a1a]"
      : color === "amber"
        ? "bg-[#e29100]"
        : color === "emerald"
          ? "bg-[#006c4a]"
          : "bg-slate-400";

  return (
    <article className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${colorDot}`} />
          <h3 className="font-bold text-[#191c1e]">{title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{orders.length}</span>
      </div>

      <div className="space-y-3 p-3 max-h-[65vh] overflow-y-auto">
        {loading ? (
          <p className="text-center text-sm text-slate-500 py-8">جاري التحميل...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">لا توجد طلبات.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{order.orderNumber}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(order.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm font-bold text-[#191c1e]">{order.customerName}</p>
              <p className="text-[11px] text-slate-500 mt-1">{order.customerPhone ?? "بدون هاتف"}</p>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{order.addressLine ?? "بدون عنوان (طلب POS)"}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-xs font-bold text-[#006c4a]" dir="ltr">{formatEgp(order.totalAmount)}</span>
                <span className="text-[10px] text-slate-400">{order.channel === "ONLINE" ? "Online" : "POS"}</span>
              </div>
              {actions && <div className="mt-2">{actions(order, updatingOrderId === order.id)}</div>}
            </div>
          ))
        )}
      </div>
    </article>
  );
}
