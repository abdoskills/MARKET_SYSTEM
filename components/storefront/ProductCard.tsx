"use client";

import React from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { formatEgp } from "@/lib/format/locale";

interface ProductCardProps {
  product?: {
    id: string;
    nameAr: string;
    salePrice: number;
    imageUrl?: string | null;
  };
  id?: string;
  name?: string;
  price?: number;
  imageUrl?: string;
  onAddToCart?: (id: string) => void;
}

export default function ProductCard({ product, id, name, price, imageUrl, onAddToCart }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [imageFailed, setImageFailed] = React.useState(false);
  const resolvedId = product?.id ?? id ?? "";
  const resolvedName = product?.nameAr ?? name ?? "منتج";
  const resolvedPrice = product?.salePrice ?? price ?? 0;
  const resolvedImage = (product?.imageUrl ?? imageUrl ?? "").trim();
  const hasImage = Boolean(resolvedImage) && !imageFailed;
  const canUseNextImage = resolvedImage.startsWith("/") || resolvedImage.startsWith("data:image/");

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(resolvedId);
      return;
    }

    addItem({
      id: resolvedId,
      nameAr: resolvedName,
      imageUrl: resolvedImage ?? null,
      salePrice: resolvedPrice,
      taxRatePercent: 0,
      quantity: 1,
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-ambient hover:-translate-y-2 transition-all duration-500 border-none overflow-hidden flex flex-col group">
      <div className="relative aspect-square bg-surface-container-lowest flex items-center justify-center overflow-hidden p-4">
        {hasImage ? (
          canUseNextImage ? (
          <Image 
            src={resolvedImage} 
            alt={resolvedName} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageFailed(true)}
          />
          ) : (
            <img
              src={resolvedImage}
              alt={resolvedName}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          )
        ) : (
          <div className="w-20 h-20 bg-[#e5e2db] rounded-full flex items-center justify-center">
            <span className="text-[#003527] font-bold text-3xl">{resolvedName.charAt(0)}</span>
          </div>
        )}
      </div>
      
      <div className="p-4 lg:p-5 flex flex-col flex-grow bg-transparent">
        <h3 className="font-bold text-[#1c1c18] text-lg mb-1 line-clamp-2 leading-tight min-h-[44px]">{resolvedName}</h3>
        <div className="mt-auto pt-3 flex flex-col gap-3">
          <p className="text-[#003527] font-black text-xl font-serif">{formatEgp(resolvedPrice)}</p>
          
          <button 
            onClick={handleAdd}
            className="w-full min-h-[48px] bg-[#e5e2db] text-[#003527] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#003527] hover:text-white transition-all active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-[#003527]"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>إضافة إلى السلة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
