"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  Bell,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  PanelLeft,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  WalletMinimal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ShareLinkDialog } from "./share-link-dialog";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  image?: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Assistant", icon: Sparkles, image: "/AI.jpeg", exact: true },
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package, exact: false },
  { href: "/dashboard/revenue", label: "Revenue", icon: WalletMinimal, exact: true },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt, exact: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/dashboard/credit-score", label: "Credit Score", icon: Award, exact: true },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard/orders/", title: "Order detail" },
  { prefix: "/dashboard/orders", title: "Orders" },
  { prefix: "/dashboard/inventory", title: "Inventory" },
  { prefix: "/dashboard/revenue", title: "Revenue" },
  { prefix: "/dashboard/expenses", title: "Expenses" },
  { prefix: "/dashboard/analytics", title: "Analytics" },
  { prefix: "/dashboard/credit-score", title: "Credit Score" },
  { prefix: "/dashboard/billing", title: "Billing" },
  { prefix: "/dashboard/settings", title: "Settings" },
  { prefix: "/dashboard/overview", title: "Overview" },
  { prefix: "/dashboard", title: "Assistant" },
];

function pageTitle(pathname: string) {
  for (const t of TITLES) {
    if (pathname === t.prefix || (t.prefix !== "/dashboard" && pathname.startsWith(t.prefix))) return t.title;
  }
  return "Overview";
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(dark ? "light" : "dark")}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{dark ? "Light mode" : "Dark mode"}</TooltipContent>
    </Tooltip>
  );
}

export function DashboardShell({
  children,
  businessName,
  businessSlug,
  userEmail,
  publicUrl,
  pendingCount,
  impersonating = false,
}: {
  children: React.ReactNode;
  businessName: string;
  businessSlug: string;
  userEmail: string;
  publicUrl: string;
  pendingCount: number;
  impersonating?: boolean;
}) {
  const pathname = usePathname();

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-0">
        <div className="flex shrink-0 items-center justify-center">
          <Image
            src="/tagly.png"
            alt="Tagly logo"
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-[10.5px] object-contain"
          />
        </div>
      </Link>
      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-[#0866FF20] text-[#0866FF] dark:bg-[#0866FF15] dark:text-[#a8fe65]" : "text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  width={20}
                  height={20}
                  className={cn(
                    "h-5 w-5 shrink-0 rounded-md object-contain transition-opacity",
                    active ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                  )}
                />
              ) : (
                  <Icon size={20} className={active ? "text-[#0866FF] dark:text-[#a8fe65]" : "text-gray-400 dark:text-zinc-500"} />
              )}
              <span className="flex-1">{item.label}</span>
              {item.href === "/dashboard/orders" && pendingCount > 0 && (
                <Badge className="bg-[#0866FF] text-white hover:bg-[#0052CC]">{pendingCount}</Badge>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <div className="px-3 pb-1">
          <ThemeToggle />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-zinc-900 hover:bg-gray-100 dark:text-zinc-100 dark:hover:bg-zinc-900">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{(userEmail || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm">{userEmail}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{businessName}</p>
              <p className="truncate text-xs text-gray-500">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`/${businessSlug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <ExternalLink size={16} /> View public link
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <form action="/auth/signout" method="POST" className="w-full">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut size={16} /> Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-white dark:bg-zinc-950">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 bg-white dark:bg-zinc-950 md:block">
          <div className="sticky top-0 h-screen overflow-hidden p-4 pt-2">{nav}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {impersonating && (
            <div className="z-40 bg-red-600 px-6 py-2 text-center text-sm font-medium text-white">
              Viewing as {businessName} —{" "}
              <Link href="/admin/exit" className="underline">
                Exit
              </Link>
            </div>
          )}
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white dark:bg-zinc-950">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 md:px-6 md:py-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 md:hidden [&_svg]:size-5"
                    aria-label="Open menu"
                  >
                    <PanelLeft size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 h-[calc(100vh-8rem)]">
                    <ScrollArea className="h-full">{nav}</ScrollArea>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="hidden text-lg font-semibold text-zinc-900 dark:text-zinc-100 md:block">{pageTitle(pathname)}</h1>
              <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
                <div className="flex shrink-0 items-center justify-center">
                  <Image
                    src="/tagly.png"
                    alt="Tagly logo"
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-[10.5px] object-contain"
                  />
               </div>
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/dashboard/orders?filter=pending"
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      aria-label="Pending orders"
                    >
                      <Bell size={20} />
                      {pendingCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0866FF] px-1 text-[11px] font-semibold text-white">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    {pendingCount > 0 ? `${pendingCount} pending orders` : "No pending orders"}
                  </TooltipContent>
                </Tooltip>
                <ShareLinkDialog url={publicUrl} />
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-6">
            <div className={cn("overflow-x-clip py-2", pathname === "/dashboard" ? "flex flex-1 flex-col min-h-0" : "space-y-6")}>{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
