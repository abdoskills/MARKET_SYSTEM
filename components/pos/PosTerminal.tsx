"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Plus, Search, Trash2 } from "lucide-react";
import CartDrawer from "./CartDrawer";
import SyncStatusBadge from "./SyncStatusBadge";
import { useCartStore } from "@/lib/store/cartStore";
import { formatEgp } from "@/lib/format/locale";

type PosProduct = {
  id: string;
  nameAr: string;
  salePrice: number;
  imageUrl: string | null;
};

type PosTerminalProps = {
  products?: PosProduct[];
};

export default function PosTerminal({ products = [] }: PosTerminalProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const totals = useCartStore((state) => state.totals);
  const removeItem = useCartStore((state) => state.removeItem);
  const displayProducts = products;
  
  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white p-4 shadow-sm flex items-center justify-between z-10 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-emerald-base">نقطة البيع</h1>
            <SyncStatusBadge />
          </div>
          <div className="relative w-64 md:w-80">
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              className="w-full pl-4 pr-11 py-2 min-h-[44px] bg-gray-50 rounded-xl border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-base focus:border-transparent transition-all"
            />
            <Search className="w-5 h-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </header>

        {/* Product Grid Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 lg:pb-4 pb-24">
          {displayProducts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
              لا توجد منتجات حقيقية حالياً. أضف منتجات من لوحة المخزون.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {displayProducts.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[180px] hover:shadow-md transition-shadow"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.nameAr}
                      className="w-16 h-16 rounded-full mb-3 object-cover border border-gray-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-soft-mint rounded-full mb-3 flex items-center justify-center">
                      <span className="text-emerald-base font-bold text-xl">{idx + 1}</span>
                    </div>
                  )}
                  <h3 className="font-semibold text-center mb-1 text-gray-800">{item.nameAr}</h3>
                  <p className="text-emerald-base font-bold mb-4">{formatEgp(item.salePrice)}</p>
                  <button
                    onClick={() =>
                      addItem({
                        id: item.id,
                        nameAr: item.nameAr,
                        salePrice: item.salePrice,
                        taxRatePercent: 0,
                        quantity: 1,
                      })
                    }
                    className="w-full min-h-[44px] bg-soft-mint text-emerald-base rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-base hover:text-white transition-colors"
                  >
                    <Plus className="w-5 h-5" /> إضافة
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Mobile Floating Action Button (FAB) */}
        <button
          className="lg:hidden absolute bottom-6 left-6 z-30 min-h-[64px] min-w-[64px] bg-emerald-base text-white rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
          onClick={() => setIsCartOpen(true)}
        >
          <div className="relative">
            <ShoppingCart className="w-7 h-7" />
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm">{totals.itemsCount}</span>
          </div>
        </button>
      </div>

      {/* Desktop Sidebar Cart (Visible on lg+) */}
      <aside className="hidden lg:flex flex-col w-[380px] bg-white shadow-xl z-20 border-r border-gray-200">
        <div className="p-6 border-b border-gray-100 bg-soft-mint/30">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-emerald-base">
            <ShoppingCart className="w-7 h-7" /> السلة
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-gray-500">لا توجد عناصر في السلة</div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg text-gray-800">{item.nameAr}</h3>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">الكمية: {item.quantity}</span>
                  <span className="font-bold text-emerald-base text-lg">{formatEgp(item.lineTotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center mb-6 text-xl font-bold text-gray-800">
            <span>الإجمالي</span>
            <span className="text-emerald-base text-2xl">{formatEgp(totals.total)}</span>
          </div>
          <Link
            href="/checkout"
            className="w-full min-h-[54px] bg-emerald-base text-white rounded-2xl font-bold text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
          >
            إتمام الطلب
          </Link>
        </div>
      </aside>

      {/* Mobile Swipeable Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        total={totals.total}
        onRemoveItem={removeItem}
      />
    </div>
  );
}
