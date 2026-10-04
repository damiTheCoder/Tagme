"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeft,
  Settings,
  ShoppingBag,
} from "lucide-react";
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

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/dashboard/products", label: "Products", icon: Package, exact: false },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard/orders/", title: "Order detail" },
  { prefix: "/dashboard/orders", title: "Orders" },
  { prefix: "/dashboard/products", title: "Products" },
  { prefix: "/dashboard/analytics", title: "Analytics" },
  { prefix: "/dashboard/settings", title: "Settings" },
  { prefix: "/dashboard", title: "Overview" },
];

function pageTitle(pathname: string) {
  for (const t of TITLES) {
    if (pathname === t.prefix || (t.prefix !== "/dashboard" && pathname.startsWith(t.prefix))) return t.title;
  }
  return "Overview";
}

export function DashboardShell({
  children,
  businessName,
  businessSlug,
  userEmail,
  publicUrl,
  pendingCount,
}: {
  children: React.ReactNode;
  businessName: string;
  businessSlug: string;
  userEmail: string;
  publicUrl: string;
  pendingCount: number;
}) {
  const pathname = usePathname();

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
        <Image src="/Tagme.png" alt="TagMe logo" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-contain" />
        <span className="text-lg font-semibold text-zinc-900">TagMe</span>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-[#0066ff] text-white" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon size={20} className={active ? "text-white" : "text-gray-400"} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/dashboard/orders" && pendingCount > 0 && (
                <Badge className="bg-[#0066ff] text-white hover:bg-[#0066ff]">{pendingCount}</Badge>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-100">
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
              <a href={`/b/${businessSlug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
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
      <div className="flex min-h-screen bg-white">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 bg-white md:block">
          <div className="sticky top-0 h-screen overflow-hidden p-4 py-6">{nav}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <PanelLeft size={24} />
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
              <h1 className="hidden text-lg font-semibold text-zinc-900 md:block">{pageTitle(pathname)}</h1>
              <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
                <Image src="/Tagme.png" alt="TagMe logo" width={28} height={28} className="h-7 w-7 shrink-0 rounded-md object-contain" />
                <span className="text-lg font-semibold text-zinc-900">TagMe</span>
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/dashboard/orders?filter=pending"
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      aria-label="Pending orders"
                    >
                      <Bell size={20} />
                      {pendingCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0066ff] px-1 text-[11px] font-semibold text-white">
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

          <main className="mx-auto w-full max-w-6xl flex-1 p-6">
            <div className="space-y-6 py-2">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
