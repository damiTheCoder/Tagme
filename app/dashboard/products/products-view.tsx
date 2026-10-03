"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Pencil, Plus, ClipboardPaste, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductDialog } from "./product-dialog";
import { ImportDialog } from "./import-dialog";
import { deleteProduct, updateProduct, type Product } from "./actions";

function formatPrice(price: number, currency: string) {
  return formatCurrency(price, currency);
}

export function ProductsView({ products, currency }: { products: Product[]; currency: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setDialogOpen(true);
  }

  async function onToggle(product: Product, next: boolean) {
    setTogglingId(product.id);
    const result = await updateProduct(product.id, { in_stock: next });
    setTogglingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(next ? "Product marked in stock" : "Product marked out of stock");
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
        title="Products"
        description={`${products.length} product${products.length === 1 ? "" : "s"} in your catalog.`}
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

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      {p.description && (
                        <p className="max-w-40 truncate text-xs text-gray-500">{p.description}</p>
                      )}
                    </TableCell>
                    <TableCell>{formatPrice(p.price, currency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.in_stock}
                          disabled={togglingId === p.id}
                          onCheckedChange={(v) => onToggle(p, v)}
                          aria-label={`Toggle stock for ${p.name}`}
                        />
                        <Badge variant={p.in_stock ? "green" : "gray"}>
                          {togglingId === p.id ? "…" : p.in_stock ? "In stock" : "Out of stock"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Pencil size={16} /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmingId(p.id)}>
                          <Trash2 size={16} /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {dialogOpen && (
        <ProductDialog key={editing?.id ?? "new"} product={editing} onClose={() => setDialogOpen(false)} />
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
