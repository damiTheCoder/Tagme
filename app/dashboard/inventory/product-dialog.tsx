"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProduct, updateProduct, type InventoryProduct } from "./actions";

export function ProductDialog({
  product,
  onClose,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product != null ? String(product.price) : "");
  const [stockCount, setStockCount] = useState(
    product?.stock_count != null ? String(product.stock_count) : "100"
  );
  const [threshold, setThreshold] = useState(
    product?.low_stock_threshold != null ? String(product.low_stock_threshold) : "3"
  );
  const [details, setDetails] = useState(product?.details ?? "");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name,
      description,
      price,
      stock_count: stockCount === "" ? 0 : Number(stockCount),
      low_stock_threshold: threshold === "" ? 3 : Number(threshold),
      details,
    };
    const result =
      product == null
        ? await createProduct(payload)
        : await updateProduct(product.id, payload);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(product == null ? "Product added" : "Product updated");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product == null ? "Add product" : "Edit product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Stock count
              <Input
                type="number"
                min="0"
                step="1"
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Low stock threshold
              <Input
                type="number"
                min="0"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Details for the AI
            <textarea
              rows={6}
              maxLength={2000}
              placeholder="Everything the AI should know about this product. Ingredients, size, who it's for, how long it takes to make, common questions — write it like you're explaining to a new staff member."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-28 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066ff]"
            />
          </label>
          <p className="-mt-1 text-xs text-gray-500">
            This is what the AI uses to answer customer questions. It won&apos;t be
            shown as a product description — customers only see the name, price,
            and your chat responses.
          </p>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Saving…" : product == null ? "Add product" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
