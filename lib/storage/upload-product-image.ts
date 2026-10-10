import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function extFor(file: File): string {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new Error("Image must be JPG, PNG, or WebP.");
  return ext;
}

function storagePath(businessId: string, productId: string, ext: string) {
  return `${businessId}/${productId}.${ext}`;
}

/** Upload (or replace) a product image. Returns the public URL. */
export async function uploadProductImage(
  businessId: string,
  productId: string,
  file: File
): Promise<string> {
  if (!(file instanceof File)) throw new Error("No image file provided.");
  if (file.size <= 0) throw new Error("Image file is empty.");
  if (file.size > MAX_BYTES) throw new Error("Image must be 5MB or less.");
  const ext = extFor(file);

  const admin = createAdminClient();
  // Remove any previous extension variant for this product first.
  await deleteProductImage(businessId, productId).catch(() => {});

  const path = storagePath(businessId, productId, ext);
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Remove all stored image variants for a product. Never throws. */
export async function deleteProductImage(
  businessId: string,
  productId: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(BUCKET)
      .list(businessId, { search: productId });
    const files = (data ?? [])
      .map((f) => f.name)
      .filter((n) => n.startsWith(`${productId}.`));
    if (files.length === 0) return;
    await admin.storage
      .from(BUCKET)
      .remove(files.map((n) => `${businessId}/${n}`));
  } catch {
    // Image cleanup is best-effort; never blocks product mutations.
  }
}
