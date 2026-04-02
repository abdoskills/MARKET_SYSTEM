import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type CartProduct = {
  id: string;
  sku?: string;
  nameAr: string;
  imageUrl?: string | null;
  unit?: string;
  salePrice?: number;
  price?: number;
  taxRatePercent?: number;
  quantity?: number;
};

type NormalizedCartProduct = {
  id: string;
  sku: string;
  nameAr: string;
  imageUrl: string | null;
  unit: string;
  salePrice: number;
  taxRatePercent: number;
};

export type CartItem = NormalizedCartProduct & {
  quantity: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
};

type CartTotals = {
  itemsCount: number;
  subtotal: number;
  tax: number;
  total: number;
};

type CartState = {
  items: CartItem[];
  totals: CartTotals;
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  replaceCart: (items: CartItem[]) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
};

const emptyTotals: CartTotals = {
  itemsCount: 0,
  subtotal: 0,
  tax: 0,
  total: 0,
};

const round3 = (value: number) => Math.round(value * 1000) / 1000;

function normalizeProduct(input: CartProduct) {
  return {
    id: input.id,
    sku: input.sku ?? input.id,
    nameAr: input.nameAr,
    imageUrl: input.imageUrl ?? null,
    unit: input.unit ?? "pcs",
    salePrice: input.salePrice ?? input.price ?? 0,
    taxRatePercent: input.taxRatePercent ?? 0,
  };
}

function buildLine(product: CartProduct, quantity: number): CartItem {
  const normalized = normalizeProduct(product);
  const lineSubtotal = round3(normalized.salePrice * quantity);
  const lineTax = round3(lineSubtotal * (normalized.taxRatePercent / 100));
  const lineTotal = round3(lineSubtotal + lineTax);

  return {
    ...normalized,
    quantity,
    lineSubtotal,
    lineTax,
    lineTotal,
  };
}

function calculateTotals(items: CartItem[]): CartTotals {
  return items.reduce<CartTotals>(
    (acc, item) => ({
      itemsCount: acc.itemsCount + item.quantity,
      subtotal: round3(acc.subtotal + item.lineSubtotal),
      tax: round3(acc.tax + item.lineTax),
      total: round3(acc.total + item.lineTotal),
    }),
    { ...emptyTotals },
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totals: { ...emptyTotals },

      addItem: (product, quantity = 1) => {
        const normalized = normalizeProduct(product);
        const finalQuantity = quantity > 0 ? quantity : (product.quantity ?? 1);
        if (finalQuantity <= 0) return;

        set((state) => {
          const existing = state.items.find((item) => item.id === normalized.id);
          const nextItems = existing
            ? state.items.map((item) =>
                item.id === normalized.id
                  ? buildLine(normalized, item.quantity + finalQuantity)
                  : item,
              )
            : [...state.items, buildLine(normalized, finalQuantity)];

          return { items: nextItems, totals: calculateTotals(nextItems) };
        });
      },

      removeItem: (productId) => {
        set((state) => {
          const nextItems = state.items.filter((item) => item.id !== productId);
          return { items: nextItems, totals: calculateTotals(nextItems) };
        });
      },

      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => {
          const nextItems = state.items.map((item) =>
            item.id === productId
              ? buildLine(
                  {
                    id: item.id,
                    sku: item.sku,
                    nameAr: item.nameAr,
                    imageUrl: item.imageUrl,
                    unit: item.unit,
                    salePrice: item.salePrice,
                    taxRatePercent: item.taxRatePercent,
                  },
                  quantity,
                )
              : item,
          );

          return { items: nextItems, totals: calculateTotals(nextItems) };
        });
      },

      replaceCart: (items) => set({ items, totals: calculateTotals(items) }),

      clearCart: () => set({ items: [], totals: { ...emptyTotals } }),

      getItemQuantity: (productId) =>
        get().items.find((item) => item.id === productId)?.quantity ?? 0,
    }),
    {
      name: "pristine-pos-cart-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        totals: state.totals,
      }),
      version: 1,
    },
  ),
);
