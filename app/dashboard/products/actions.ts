"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignPublicId } from "@/app/dashboard/inventory/actions";

export type Product = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  in_stock: boolean;
  stock_count: number | null;
  low_stock_threshold: number | null;
  details: string | null;
  public_id?: string | null;
  created_at: string;
};

export type ProductsResult =
  | { ok: true; products: Product[] }
  | { ok: false; error: string };

export type MutateResult =
  | { ok: true; product: Product }
  | { ok: false; error: string };

export type BulkResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

const MAX_BULK = 200;

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

function cleanPrice(price: unknown): number {
  const n = typeof price === "string" ? Number(price) : price;
  if (typeof n !== "number" || !Number.isFinite(n))
    throw new Error("Price must be a number.");
  if (n < 0) throw new Error("Price must be 0 or more.");
  return Math.round(n * 100) / 100;
}

function cleanInStock(inStock: unknown): boolean {
  if (inStock == null) return true;
  return Boolean(inStock);
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

function cleanStockCount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || Math.floor(n) !== n)
    throw new Error("Stock count must be a whole number.");
  if (n < 0) throw new Error("Stock count must be 0 or more.");
  return n;
}

function cleanThreshold(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || Math.floor(n) !== n)
    throw new Error("Low stock threshold must be a whole number.");
  if (n < 0) throw new Error("Low stock threshold must be 0 or more.");
  return n;
}

export async function listProducts(): Promise<ProductsResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, business_id, name, description, price, in_stock, stock_count, low_stock_threshold, details, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { ok: true, products: data ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to load products." };
  }
}

export async function createProduct(input: {
  name: string;
  description?: string | null;
  price: number | string;
  in_stock?: boolean;
  details?: string | null;
}): Promise<MutateResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        business_id: business.id,
        name: cleanName(input.name),
        description: cleanDescription(input.description),
        price: cleanPrice(input.price),
        in_stock: cleanInStock(input.in_stock),
        details: cleanDetails(input.details),
      })
      .select("id, business_id, name, description, price, in_stock, stock_count, low_stock_threshold, details, created_at")
      .single();

    if (error) throw new Error(error.message);
    const public_id = await assignPublicId(business.id, data.id);
    revalidatePath("/dashboard/products");
    return { ok: true, product: { ...data, public_id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create product." };
  }
}

export async function updateProduct(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    price?: number | string;
    in_stock?: boolean;
    details?: string | null;
  }
): Promise<MutateResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Product id is required.");

    const patch: {
      name?: string;
      description?: string | null;
      price?: number;
      in_stock?: boolean;
      details?: string | null;
    } = {};
    if (input.name !== undefined) patch.name = cleanName(input.name);
    if (input.description !== undefined)
      patch.description = cleanDescription(input.description);
    if (input.price !== undefined) patch.price = cleanPrice(input.price);
    if (input.in_stock !== undefined) patch.in_stock = Boolean(input.in_stock);
    if (input.details !== undefined) patch.details = cleanDetails(input.details);
    if (Object.keys(patch).length === 0)
      throw new Error("Nothing to update.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .eq("business_id", business.id)
      .select("id, business_id, name, description, price, in_stock, stock_count, low_stock_threshold, details, created_at")
      .single();

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/products");
    return { ok: true, product: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update product." };
  }
}

export async function deleteProduct(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
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
    revalidatePath("/dashboard/products");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete product." };
  }
}

export async function createProductsBulk(
  products: Array<{
    name: string;
    description?: string | null;
    price: number | string;
    in_stock?: boolean;
    stock_count?: number | string | null;
    low_stock_threshold?: number | string | null;
  }>
): Promise<BulkResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!Array.isArray(products) || products.length === 0)
      throw new Error("No products to import.");
    if (products.length > MAX_BULK)
      throw new Error(`Cannot import more than ${MAX_BULK} products at once.`);

    const rows = products.map((p, i) => {
      try {
        const stock_count = cleanStockCount(p.stock_count);
        const in_stock =
          stock_count != null ? stock_count > 0 : cleanInStock(p.in_stock);
        return {
          business_id: business.id,
          name: cleanName(p.name),
          description: cleanDescription(p.description),
          price: cleanPrice(p.price),
          in_stock,
          stock_count: stock_count ?? 100,
          low_stock_threshold: cleanThreshold(p.low_stock_threshold) ?? 3,
        };
      } catch (e) {
        throw new Error(
          `Row ${i + 1}: ${e instanceof Error ? e.message : "invalid product."}`
        );
      }
    });

    const supabase = await createClient();
    const { error } = await supabase.from("products").insert(rows);
    if (error) throw new Error(error.message);

    // Sequential public IDs in import order for rows missing one.
    const { data: missing } = await supabase
      .from("products")
      .select("id")
      .eq("business_id", business.id)
      .is("public_id", null)
      .order("created_at", { ascending: true });
    for (const row of missing ?? []) {
      try {
        await assignPublicId(business.id, row.id);
      } catch {
        // Best-effort: a collision retry failure shouldn't fail the import.
        break;
      }
    }

    revalidatePath("/dashboard/products");
    return { ok: true, count: rows.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to import products." };
  }
}
