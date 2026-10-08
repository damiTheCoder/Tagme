"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  ClipboardPaste,
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductDialog } from "./product-dialog";
import { ImportDialog } from "../products/import-dialog";
import {
  adjustStock,
  deleteProduct,
  type InventoryProduct,
} from "./actions";

type Filter = "all" | "low" | "out" | "in";

function thresholdOf(p: InventoryProduct): number {
  return p.low_stock_threshold ?? 3;
}

function stockState(p: InventoryProduct): "out" | "low" | "ok" | "unknown" {
  if (p.stock_count == null) return "unknown";
  if (p.stock_count === 0) return "out";
  if (p.stock_count <= thresholdOf(p)) return "low";
  return "ok";
}

export function InventoryView({
  products,
  currency,
}: {
  products: InventoryProduct[];
  currency: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const p of products) {
      const s = stockState(p);
      if (s === "low") low += 1;
      if (s === "out") out += 1;
    }
    return { total: products.length, low, out };
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      const s = stockState(p);
      if (filter === "low") return s === "low";
      if (filter === "out") return s === "out";
      if (filter === "in") return s === "ok";
      return true;
    });
  }, [products, filter, search]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(product: InventoryProduct) {
    setEditing(product);
    setDialogOpen(true);
  }

  async function onAdjust(product: InventoryProduct, delta: number) {
    setAdjustingId(product.id);
    const result = await adjustStock(product.id, delta);
    setAdjustingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function onDelete(id: string) {
    setDeleting(true);
    const result = await deleteProduct(id);
    setDeleting(false);
    setConfirmingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Product deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${counts.total} product${counts.total === 1 ? "" : "s"} in stock tracking.`}
        action={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <ClipboardPaste size={16} /> Paste a price list
            </Button>
            <Button onClick={openAdd}>
              <Plus size={16} /> Add product
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total products" value={String(counts.total)} />
        <StatCard
          title="Low stock"
          value={String(counts.low)}
          trend={counts.low > 0 ? "Needs restocking" : "All healthy"}
          trendTone={counts.low > 0 ? "down" : "neutral"}
        />
        <StatCard
          title="Out of stock"
          value={String(counts.out)}
          trend={counts.out > 0 ? "Selling opportunity lost" : "Nothing sold out"}
          trendTone={counts.out > 0 ? "down" : "neutral"}
        />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No products yet"
          description="Add your first product or paste your price list and let AI structure it for you."
          action={
            <div className="flex gap-2">
              <Button onClick={openAdd}>
                <Plus size={16} /> Add your first product
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                Paste a price list
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="low">Low stock</TabsTrigger>
                <TabsTrigger value="out">Out of stock</TabsTrigger>
                <TabsTrigger value="in">In stock</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead title="Whether the AI has product details to answer questions">
                      AI
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((p) => {
                    const state = stockState(p);
                    return (
                      <TableRow
                        key={p.id}
                        className={
                          state === "out"
                            ? "bg-red-50"
                            : state === "low"
                              ? "bg-amber-50"
                              : undefined
                        }
                      >
                        <TableCell>
                          <p className="font-medium">{p.name}</p>
                          {p.description && (
                            <p className="max-w-40 truncate text-xs text-gray-500">
                              {p.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(p.price, currency)}</TableCell>
                        <TableCell>
                          {p.stock_count == null ? (
                            <span className="text-sm text-gray-400">—</span>
                          ) : (
                            <span
                              className={`text-lg font-semibold tabular-nums ${
                                state === "out"
                                  ? "text-red-600"
                                  : state === "low"
                                    ? "text-amber-600"
                                    : "text-green-700"
                              }`}
                            >
                              {p.stock_count}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            title={
                              p.details && p.details.trim()
                                ? "AI has context"
                                : "Add details so the AI can answer questions better"
                            }
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              p.details && p.details.trim()
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={adjustingId === p.id}
                              onClick={() => onAdjust(p, -1)}
                              aria-label={`Decrease stock for ${p.name}`}
                            >
                              <Minus size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={adjustingId === p.id}
                              onClick={() => onAdjust(p, 1)}
                              aria-label={`Increase stock for ${p.name}`}
                            >
                              <Plus size={16} />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                              <Pencil size={16} /> Edit
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  aria-label={`More actions for ${p.name}`}
                                >
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setConfirmingId(p.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 size={16} /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visible.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500">
                        No products match this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {dialogOpen && (
        <ProductDialog
          key={editing?.id ?? "new"}
          product={editing}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}

      <Dialog open={confirmingId !== null} onOpenChange={(o) => !o && setConfirmingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmingId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmingId && onDelete(confirmingId)}
              disabled={deleting}
            >
              {deleting && <Loader2 size={16} className="animate-spin" />}
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
