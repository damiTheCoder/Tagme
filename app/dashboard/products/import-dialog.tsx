"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProductsBulk } from "./actions";

type EditableRow = { name: string; price: string; in_stock: boolean };

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [importing, setImporting] = useState(false);

  async function onParse() {
    setParseError(null);
    setParsing(true);
    try {
      const res = await fetch("/api/products/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setParseError(data.error ?? "Failed to parse. Try again.");
        return;
      }
      const parsed = data.products ?? [];
      if (parsed.length === 0) {
        setParseError("No products with prices found in that text.");
        return;
      }
      setRows(parsed.map((p: { name: string; price: number; in_stock?: boolean }) => ({
        name: p.name,
        price: String(p.price),
        in_stock: p.in_stock ?? true,
      })));
    } catch {
      setParseError("Failed to parse. Check your connection and try again.");
    } finally {
      setParsing(false);
    }
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) => (prev == null ? prev : prev.map((r, i) => (i === index ? { ...r, ...patch } : r))));
  }

  function removeRow(index: number) {
    setRows((prev) => (prev == null ? prev : prev.filter((_, i) => i !== index)));
  }

  async function onImport() {
    if (rows == null || rows.length === 0) return;
    setImporting(true);
    const result = await createProductsBulk(rows.map((r) => ({ name: r.name, price: r.price, in_stock: r.in_stock, stock_count: 100, low_stock_threshold: 3 })));
    setImporting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.count} products added`);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import from price list</DialogTitle>
          <DialogDescription>Paste your price list and let AI structure it for you.</DialogDescription>
        </DialogHeader>
        {rows == null ? (
          <div className="flex flex-col gap-3">
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Chocolate cake - 15000\nVanilla cake - 12000\nCupcakes (6 pack) - 8000"}
              className="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd3fc]"
            />
            {parseError && <p className="text-sm text-red-600">{parseError}</p>}
            <Button onClick={onParse} disabled={parsing || !text.trim()}>
              {parsing && <Loader2 size={16} className="animate-spin" />}
              {parsing ? "Parsing…" : "Parse with AI"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">Review the parsed products, then add them to your catalog.</p>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Name" value={row.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
                  <Input type="number" min="0" step="0.01" placeholder="Price" value={row.price} onChange={(e) => updateRow(i, { price: e.target.value })} className="w-28" />
                  <input type="checkbox" title="In stock" checked={row.in_stock} onChange={(e) => updateRow(i, { in_stock: e.target.checked })} />
                  <button onClick={() => removeRow(i)} aria-label="Remove row" className="rounded px-2 py-1 text-sm text-red-600 hover:bg-gray-50">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRows(null)} disabled={importing}>
                Back
              </Button>
              <Button onClick={onImport} disabled={importing || rows.length === 0}>
                {importing && <Loader2 size={16} className="animate-spin" />}
                {importing ? "Adding…" : `Add ${rows.length} to catalog`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
