"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import type { CartItem } from "@/lib/store/cartStore";
import { formatEgp } from "@/lib/format/locale";

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  total,
  onRemoveItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onRemoveItem: (productId: string) => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl flex flex-col lg:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
            dir="rtl"
            style={{ maxHeight: "90vh" }}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
            <div className="flex justify-between items-center px-4 mb-4 mt-2">
              <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-base">
                <ShoppingCart className="w-6 h-6" /> السلة
              </h2>
              <button
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-soft-mint text-emerald-base hover:bg-emerald-base hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {items.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-4 mb-3 text-gray-500">لا توجد عناصر في السلة</div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-4 mb-3 flex items-center justify-between min-h-[80px]">
                    <div>
                      <h3 className="font-semibold text-gray-800">{item.nameAr}</h3>
                      <p className="text-gray-500 text-sm">{formatEgp(item.salePrice)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-base">{formatEgp(item.lineTotal)}</span>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 rounded-b-3xl pb-8">
              <div className="flex justify-between items-center mb-5 text-lg font-bold">
                <span>الإجمالي</span>
                <span className="text-emerald-base text-2xl">{formatEgp(total)}</span>
              </div>
              <Link href="/checkout" className="w-full min-h-[54px] bg-emerald-base text-white rounded-2xl font-bold text-lg flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all">
                إتمام الطلب
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
