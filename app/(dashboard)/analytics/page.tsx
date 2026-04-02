"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEgp, formatNumberAr } from "@/lib/format/locale";

type Range = "today" | "week" | "month";

type AnalyticsResponse = {
  data: {
    range: Range;
    dailySales: number;
    monthlySales: number;
    totalTransactions: number;
    avgTicket: number;
    revenueDelta: number;
    salesMovement: Array<{ label: string; sales: number }>;
    turnoverAlerts: Array<{
      productId: string;
      nameAr: string;
      stockQty: number;
      lowStockThreshold: number;
      soldQty: number;
      message: string;
    }>;
    bestSelling: Array<{ productId: string; nameAr: string; quantity: number; revenue: number }>;
  };
};

async function fetchAnalytics(range: Range) {
  const response = await fetch(`/api/analytics/summary?range=${range}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("ANALYTICS_FETCH_FAILED");
  }
  return (await response.json()) as AnalyticsResponse;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("today");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-summary", range],
    queryFn: () => fetchAnalytics(range),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const summary = data?.data;
  const stats = [
    {
      title: "مبيعات الفترة",
      value: summary ? formatEgp(summary.dailySales) : formatEgp(0),
      change: summary && summary.revenueDelta >= 0 ? `+${formatEgp(summary.revenueDelta)}` : formatEgp(summary?.revenueDelta ?? 0),
      icon: DollarSign,
    },
    {
      title: "الطلبات",
      value: formatNumberAr(summary?.totalTransactions ?? 0),
      change: "Live",
      icon: ShoppingBag,
    },
    {
      title: "متوسط الفاتورة",
      value: summary ? formatEgp(summary.avgTicket) : formatEgp(0),
      change: "Auto",
      icon: Users,
    },
    {
      title: "مبيعات الشهر",
      value: summary ? formatEgp(summary.monthlySales) : formatEgp(0),
      change: "MTD",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto" dir="rtl">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#006c4a]">التحليلات والإحصائيات</h1>
          <p className="text-gray-500 mt-2">تحديث تلقائي كل 10 ثوانٍ بدون تسريب ذاكرة</p>
        </div>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          className="min-h-[44px] bg-gray-50 border border-gray-200 text-gray-700 px-4 rounded-xl outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]"
        >
          <option value="today">اليوم</option>
          <option value="week">آخر 7 أيام</option>
          <option value="month">هذا الشهر</option>
        </select>
      </div>

      {isError && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">تعذر تحميل التحليلات حالياً.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-[#e8f3ee] text-[#006c4a] rounded-full flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{stat.change}</span>
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{isLoading ? "..." : stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#006c4a]">إيرادات المبيعات</h2>
            <span className="text-xs text-gray-500">آخر تحديث: {new Date().toLocaleTimeString("ar-EG")}</span>
          </div>
          <div className="w-full h-64 bg-gray-50 border border-gray-100 rounded-xl border-dashed flex items-center justify-center">
            {isLoading ? (
              <p className="text-gray-400 font-medium">جاري تحميل البيانات...</p>
            ) : (summary?.salesMovement?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.salesMovement} margin={{ top: 12, right: 12, left: 12, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f3" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value: number) => formatNumberAr(value)} />
                  <Tooltip
                    cursor={{ fill: "rgba(15,157,115,0.08)" }}
                    formatter={(value: number) => [formatEgp(value), "المبيعات"]}
                    labelFormatter={(label) => `الفترة: ${label}`}
                  />
                  <Bar dataKey="sales" radius={[8, 8, 0, 0]} fill="#0f9d73" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 font-medium">لا توجد بيانات مبيعات في الفترة المختارة.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-[#006c4a] mb-6">المنتجات الأكثر مبيعاً</h2>
          <div className="space-y-4">
            {(summary?.bestSelling ?? []).map((product) => (
              <div key={product.productId} className="flex flex-col gap-2 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 line-clamp-1">{product.nameAr}</h3>
                  <span className="font-bold text-[#006c4a] whitespace-nowrap">{formatEgp(product.revenue)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">الكمية المباعة</span>
                  <span className="text-gray-400 font-medium">{formatNumberAr(product.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/products" className="w-full mt-6 min-h-[44px] bg-[#e8f3ee] text-[#006c4a] font-bold rounded-xl hover:bg-opacity-80 transition-colors flex items-center justify-center">
            عرض كل المنتجات
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-[#006c4a] mb-4">تنبيهات المخزون المرتبطة بسرعة البيع</h2>
        {(summary?.turnoverAlerts?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-500">لا توجد تنبيهات حرجة حالياً.</p>
        ) : (
          <div className="space-y-3">
            {summary?.turnoverAlerts.map((alert) => (
              <div key={alert.productId} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-amber-900">{alert.nameAr}</p>
                  <span className="text-xs font-semibold text-amber-800">مباع: {formatNumberAr(alert.soldQty)}</span>
                </div>
                <p className="mt-1 text-sm text-amber-800">{alert.message}</p>
                <p className="mt-1 text-xs text-amber-700">المتوفر: {formatNumberAr(alert.stockQty)} | الحد الأدنى: {formatNumberAr(alert.lowStockThreshold)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
