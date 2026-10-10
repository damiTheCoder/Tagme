"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export type CarouselProduct = {
  id: string;
  public_id: string | null;
  name: string;
  price: number | string;
  currency: string;
  image_url: string | null;
  in_stock: boolean;
};

export function ProductCarousel({
  products,
  onSelect,
}: {
  products: CarouselProduct[];
  onSelect: (product: CarouselProduct) => void;
}) {
  if (products.length === 0) return null;
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
      {products.map((p) => {
        const soldOut = !p.in_stock;
        return (
          <div
            key={p.id}
            className="w-[200px] shrink-0 snap-start overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
          >
            {p.image_url ? (
              <Image
                src={p.image_url}
                alt={p.name}
                width={400}
                height={400}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-neutral-100 text-neutral-400">
                <Package size={40} />
              </div>
            )}
            <div className="flex flex-col gap-1 p-3">
              <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
              <p className="text-sm font-bold text-[#0066ff]">
                {formatCurrency(Number(p.price), p.currency)}
              </p>
              <div className="flex items-center justify-between">
                {p.public_id && (
                  <p className="font-mono text-[11px] text-neutral-500">{p.public_id}</p>
                )}
                {soldOut && (
                  <p className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    Sold out
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={soldOut}
                onClick={() => onSelect(p)}
                className="mt-1 w-full rounded-xl bg-[#0066ff] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                {soldOut ? "Sold out" : "Select product"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
