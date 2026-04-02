"use client";

import { useCartStore } from "@/lib/store/cartStore";
import { useUIStore } from "@/lib/store/uiStore";

export default function FloatingCartBar() {
  const count = useCartStore((state) => state.totals.itemsCount);
  const openCart = useUIStore((state) => state.openCart);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-24 left-6 z-50 md:hidden">
      <button 
        onClick={openCart}
        className="bg-gradient-to-r from-[#006c4a] to-[#3fb687] text-white px-6 py-4 rounded-full shadow-[0_20px_40px_rgba(25,28,30,0.06)] flex items-center gap-3 active:scale-90 transition-transform"
      >
        <span className="material-symbols-outlined">shopping_basket</span>
        <span className="font-bold text-sm font-sans">عرض السلة ({count})</span>
      </button>
    </div>
  );
}
