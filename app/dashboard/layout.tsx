import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness, getImpersonatedBusiness } from "@/lib/auth";
import { getPendingOrderCount } from "./orders/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [business, pendingResult, impersonated] = await Promise.all([
    getCurrentBusiness(),
    getPendingOrderCount(),
    getImpersonatedBusiness(),
  ]);
  if (!business) redirect("/onboarding");
  if (business.deleted_at) redirect("/removed");
  const pendingCount = pendingResult.ok ? pendingResult.count : 0;

  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const publicUrl = `${proto}://${host}/b/${business.slug}`;

  return (
    <DashboardShell
      businessName={business.name}
      businessSlug={business.slug}
      userEmail={user.email ?? ""}
      publicUrl={publicUrl}
      pendingCount={pendingCount}
      impersonating={impersonated != null}
    >
      {children}
    </DashboardShell>
  );
}
