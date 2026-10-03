"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProduct, updateProduct, type Product } from "./actions";

export function ProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product != null ? String(product.price) : "");
  const [inStock, setInStock] = useState(product?.in_stock ?? true);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result =
      product == null
        ? await createProduct({ name, description, price, in_stock: inStock })
        : await updateProduct(product.id, { name, description, price, in_stock: inStock });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product == null ? "Add product" : "Edit product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input required type="number" min="0" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={inStock} onCheckedChange={setInStock} />
            In stock
          </label>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Saving…" : product == null ? "Add product" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
