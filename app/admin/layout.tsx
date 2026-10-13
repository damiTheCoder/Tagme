import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) notFound();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#111111] text-[#e5e5e5] md:flex">
        <div className="px-5 pb-2 pt-6">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Inference Admin
          </p>
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-neutral-800 p-4">
          <p className="truncate text-xs text-neutral-400">{admin.email}</p>
          <form action="/auth/signout" method="POST" className="mt-2">
            <button
              type="submit"
              className="text-xs text-neutral-400 underline hover:text-[#e5e5e5]"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[#f9fafb]">
        <header className="border-b border-gray-200 bg-white px-6 py-3 md:hidden">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Inference Admin
          </p>
          <nav className="mt-2 flex gap-4">
            {[
              { href: "/admin", label: "Overview" },
              { href: "/admin/businesses", label: "Businesses" },
              { href: "/admin/transactions", label: "Transactions" },
              { href: "/admin/audit", label: "Audit Log" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
