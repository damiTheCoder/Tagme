"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Receipt,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "Businesses", icon: Building2, exact: false },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt, exact: false },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 border-l-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[#a8fe65] bg-[#1f1f1f] text-[#e5e5e5]"
                : "border-transparent text-neutral-400 hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
