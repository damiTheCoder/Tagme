"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  uploadProductImage,
  deleteProductImage,
} from "@/lib/storage/upload-product-image";

export type InventoryProduct = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  in_stock: boolean;
  stock_count: number | null;
  low_stock_threshold: number | null;
  details: string | null;
  public_id: string | null;
  image_url: string | null;
  created_at: string;
};

export type InventoryResult =
  | { ok: true; products: InventoryProduct[] }
  | { ok: false; error: string };

export type InventoryMutateResult =
  | { ok: true; product: InventoryProduct }
  | { ok: false; error: string };

const SELECT =
  "id, business_id, name, description, price, in_stock, stock_count, low_stock_threshold, details, public_id, image_url, created_at";

function cleanName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Product name is required.");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Product name is required.");
  if (trimmed.length > 200)
    throw new Error("Product name must be at most 200 characters.");
  return trimmed;
}

function cleanDescription(description: unknown): string | null {
  if (description == null || description === "") return null;
  if (typeof description !== "string")
    throw new Error("Description must be a string.");
  const trimmed = description.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1000)
    throw new Error("Description must be at most 1000 characters.");
  return trimmed;
}

function cleanDetails(details: unknown): string | null {
  if (details == null || details === "") return null;
  if (typeof details !== "string") throw new Error("Details must be a string.");
  const trimmed = details.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2000)
    throw new Error("Details must be at most 2000 characters.");
  return trimmed;
}

function cleanPrice(price: unknown): number {
  const n = typeof price === "string" ? Number(price) : price;
  if (typeof n !== "number" || !Number.isFinite(n))
    throw new Error("Price must be a number.");
  if (n < 0) throw new Error("Price must be 0 or more.");
  return Math.round(n * 100) / 100;
}

function cleanStockCount(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || Math.floor(n) !== n)
    throw new Error("Stock count must be a whole number.");
  if (n < 0) throw new Error("Stock count must be 0 or more.");
  if (n > 1000000) throw new Error("Stock count is too large.");
  return n;
}

function cleanThreshold(value: unknown): number {
  if (value == null || value === "") return 3;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || Math.floor(n) !== n)
    throw new Error("Low stock threshold must be a whole number.");
  if (n < 0) throw new Error("Low stock threshold must be 0 or more.");
  if (n > 1000000) throw new Error("Low stock threshold is too large.");
  return n;
}

function touch(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

/**
 * Assign the next sequential public ID (PRD-001, PRD-002, …) for a
 * business. Gaps from deleted products are left alone. Retries on
 * unique-violation races.
 */
export async function assignPublicId(
  businessId: string,
  productId: string
): Promise<string> {
  const supabase = await createClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("products")
      .select("public_id")
      .eq("business_id", businessId)
      .not("public_id", "is", null);
    if (error) throw new Error(error.message);
    let max = 0;
    for (const row of data ?? []) {
      const m = /^PRD-(\d+)$/.exec(row.public_id ?? "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    const next = `PRD-${String(max + 1).padStart(3, "0")}`;
    const { error: updateError } = await supabase
      .from("products")
      .update({ public_id: next })
      .eq("id", productId)
      .eq("business_id", businessId)
      .is("public_id", null);
    if (!updateError) return next;
    // Unique violation (concurrent create) or already assigned: retry,
    // unless the row already has an ID.
    const { data: current } = await supabase
      .from("products")
      .select("public_id")
      .eq("id", productId)
      .maybeSingle();
    if (current?.public_id) return current.public_id as string;
  }
  throw new Error("Could not assign a product ID. Please try again.");
}

export async function listInventory(): Promise<InventoryResult> {
  // TEMP perf instrumentation for cold-start diagnosis — remove after.
  const t0 = Date.now();
  console.log("[perf] listInventory start");
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    console.log(`[perf] listInventory business resolved +${Date.now() - t0}ms`);

    const supabase = await createClient();
    const t1 = Date.now();
    const { data, error } = await supabase
      .from("products")
      .select(SELECT)
      .eq("business_id", business.id)
      .order("stock_count", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    console.log(
      `[perf] listInventory products query: ${data?.length ?? 0} rows +${Date.now() - t1}ms (total +${Date.now() - t0}ms)`
    );

    if (error) throw new Error(error.message);
    // NOTE: no revalidatePath here — reads run during page render,
    // where revalidation is unsupported. Mutations below handle it.
    return { ok: true, products: (data ?? []) as InventoryProduct[] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load inventory.",
    };
  }
}

export async function createProduct(input: {
  name: string;
  description?: string | null;
  price: number | string;
  stock_count?: number | string | null;
  low_stock_threshold?: number | string | null;
  details?: string | null;
}): Promise<InventoryMutateResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");

    const stock_count = cleanStockCount(input.stock_count);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        business_id: business.id,
        name: cleanName(input.name),
        description: cleanDescription(input.description),
        price: cleanPrice(input.price),
        stock_count,
        low_stock_threshold: cleanThreshold(input.low_stock_threshold),
        details: cleanDetails(input.details),
        in_stock: stock_count > 0,
      })
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    const public_id = await assignPublicId(business.id, data.id);
    touch(["/dashboard/inventory", "/dashboard"]);
    return { ok: true, product: { ...(data as InventoryProduct), public_id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create product.",
    };
  }
}

export async function updateProduct(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    price?: number | string;
    stock_count?: number | string | null;
    low_stock_threshold?: number | string | null;
    details?: string | null;
  }
): Promise<InventoryMutateResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Product id is required.");

    const patch: {
      name?: string;
      description?: string | null;
      price?: number;
      stock_count?: number;
      low_stock_threshold?: number;
      details?: string | null;
      in_stock?: boolean;
    } = {};
    if (input.name !== undefined) patch.name = cleanName(input.name);
    if (input.description !== undefined)
      patch.description = cleanDescription(input.description);
    if (input.price !== undefined) patch.price = cleanPrice(input.price);
    if (input.stock_count !== undefined) {
      patch.stock_count = cleanStockCount(input.stock_count);
      patch.in_stock = patch.stock_count > 0;
    }
    if (input.low_stock_threshold !== undefined)
      patch.low_stock_threshold = cleanThreshold(input.low_stock_threshold);
    if (input.details !== undefined) patch.details = cleanDetails(input.details);
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .eq("business_id", business.id)
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    touch(["/dashboard/inventory", "/dashboard"]);
    return { ok: true, product: data as InventoryProduct };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update product.",
    };
  }
}

export async function adjustStock(
  id: string,
  delta: number
): Promise<InventoryMutateResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Product id is required.");
    if (typeof delta !== "number" || !Number.isFinite(delta) || Math.floor(delta) !== delta)
      throw new Error("Delta must be a whole number.");

    const supabase = await createClient();
    const { data: current, error: fetchError } = await supabase
      .from("products")
      .select(SELECT)
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!current) throw new Error("Product not found.");

    const next = Math.max(0, (current.stock_count ?? 0) + delta);
    const { data, error } = await supabase
      .from("products")
      .update({ stock_count: next, in_stock: next > 0 })
      .eq("id", id)
      .eq("business_id", business.id)
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    touch(["/dashboard/inventory", "/dashboard"]);
    return { ok: true, product: data as InventoryProduct };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to adjust stock.",
    };
  }
}

export async function setStock(
  id: string,
  count: number | string
): Promise<InventoryMutateResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Product id is required.");
    const next = cleanStockCount(count);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .update({ stock_count: next, in_stock: next > 0 })
      .eq("id", id)
      .eq("business_id", business.id)
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    touch(["/dashboard/inventory", "/dashboard"]);
    return { ok: true, product: data as InventoryProduct };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to set stock.",
    };
  }
}

export async function deleteProduct(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Product id is required.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("business_id", business.id);

    if (error) throw new Error(error.message);
    // Best-effort image cleanup; never blocks the delete.
    await deleteProductImage(business.id, id);
    touch(["/dashboard/inventory", "/dashboard"]);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete product.",
    };
  }
}

export async function setProductImage(
  id: string,
  formData: FormData
): Promise<InventoryMutateResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Product id is required.");
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0)
      throw new Error("No image selected.");

    const image_url = await uploadProductImage(business.id, id, file);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .update({ image_url })
      .eq("id", id)
      .eq("business_id", business.id)
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    touch(["/dashboard/inventory", "/dashboard"]);
    return { ok: true, product: data as InventoryProduct };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to upload image.",
    };
  }
}
