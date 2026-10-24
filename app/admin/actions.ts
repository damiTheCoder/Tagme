"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminUser, IMPERSONATE_COOKIE } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) notFound();
  return admin;
}

/** Start viewing the dashboard as a merchant. Cookie expires in 1 hour. */
export async function impersonateBusiness(businessId: string) {
  const admin = await requireAdmin();
  if (!businessId) throw new Error("Business id is required.");
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) throw new Error("Business not found.");

  const store = await cookies();
  store.set(IMPERSONATE_COOKIE, business.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "impersonate.start",
    targetType: "business",
    targetId: business.id,
    metadata: { slug: business.slug, name: business.name },
  });
  redirect("/dashboard");
}

/** Stop impersonating and return to the admin panel. */
export async function exitImpersonation() {
  const admin = await requireAdmin();
  const store = await cookies();
  store.delete(IMPERSONATE_COOKIE);
  await logAdminAction({ adminUserId: admin.id, action: "impersonate.stop" });
  redirect("/admin");
}

export async function suspendBusiness(businessId: string) {
  const admin = await requireAdmin();
  if (!businessId) throw new Error("Business id is required.");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("businesses")
    .update({ suspended_at: new Date().toISOString() })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  await logAdminAction({
    adminUserId: admin.id,
    action: "business.suspend",
    targetType: "business",
    targetId: businessId,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
}

export async function unsuspendBusiness(businessId: string) {
  const admin = await requireAdmin();
  if (!businessId) throw new Error("Business id is required.");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("businesses")
    .update({ suspended_at: null })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  await logAdminAction({
    adminUserId: admin.id,
    action: "business.unsuspend",
    targetType: "business",
    targetId: businessId,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
}

/** Soft delete only — never hard-delete. */
export async function softDeleteBusiness(businessId: string) {
  const admin = await requireAdmin();
  if (!businessId) throw new Error("Business id is required.");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("businesses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  await logAdminAction({
    adminUserId: admin.id,
    action: "business.delete",
    targetType: "business",
    targetId: businessId,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
}
