"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createProduct,
  updateProduct,
  setProductImage,
  type InventoryProduct,
} from "./actions";

export function ProductDialog({
  product,
  onClose,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);
  const [saving, setSaving] = useState(false);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Image must be JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or less.");
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function onDropFile(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Image must be JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or less.");
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function onRemoveImage() {
    setImageFile(null);
    setPreview(product?.image_url ?? null);
    if (fileRef.current) fileRef.current.value = "";
  }

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
    if (!result.ok) {
      setSaving(false);
      toast.error(result.error);
      return;
    }
    if (imageFile) {
      const fd = new FormData();
      fd.set("image", imageFile);
      const imgResult = await setProductImage(result.product.id, fd);
      if (!imgResult.ok) {
        setSaving(false);
        toast.error(`Saved, but image upload failed: ${imgResult.error}`);
        onClose();
        router.refresh();
        return;
      }
    }
    setSaving(false);
    toast.success(product == null ? "Product added" : "Product updated");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product == null
              ? "Add product (ID will be assigned on save)"
              : `Edit product${product.public_id ? ` — ${product.public_id}` : ""}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropFile}
            className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-left transition-colors hover:border-gray-400"
          >
            {preview ? (
              <Image
                src={preview}
                alt="Product preview"
                width={160}
                height={160}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-500">
                <ImagePlus size={24} />
              </span>
            )}
            <span>
              <span className="block text-sm font-medium text-[#1a1a1a]">
                {preview ? "Replace product image" : "Click or drag to upload product image"}
              </span>
              <span className="block text-xs text-gray-500">JPG, PNG, or WebP · max 5MB</span>
            </span>
            {preview && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Remove image"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onRemoveImage();
                  }
                }}
                className="ml-auto rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <X size={16} />
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
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
              className="min-h-28 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd3fc]"
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
