"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slug";
import { ensureUniqueSlug } from "@/lib/business";

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "KES",
  "ZAR",
  "INR",
  "BRL",
  "IDR",
  "PHP",
];

export async function createBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim();

  if (!name) throw new Error("Business name is required.");
  if (!CURRENCIES.includes(currency)) throw new Error("Invalid currency.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  const base = generateSlug(name) || "business";
  const slug = await ensureUniqueSlug(base);

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name,
    slug,
    description: description || null,
    currency,
  });
  if (error) throw new Error(error.message);

  redirect("/dashboard");
}
