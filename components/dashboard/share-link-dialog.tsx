"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Download, Link2, QrCode, Share2 } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ShareLinkDialog({ url, triggerLabel = "Share your link", shortLabel = "Link" }: { url: string; triggerLabel?: string; shortLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Downscale the logo so the downloaded SVG stays lean.
  async function logoDataUrl(): Promise<string> {
    const res = await fetch("/Tagly.jpeg");
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const S = 128;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");
    const side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      S,
      S
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function onDownload() {
    const svg = document.getElementById("share-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const str = serializer.serializeToString(svg);
    // Center the logo in module units so it scales with any QR size.
    const viewBox = (svg as unknown as SVGSVGElement).viewBox.baseVal;
    const m = viewBox.width || 29;
    const logoM = m * 0.24;
    const padM = logoM * 0.2;
    const boxM = logoM + padM * 2;
    const x0 = (m - boxM) / 2;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    let composed = str;
    try {
      const dataUrl = await logoDataUrl();
      const overlay =
        `<defs><clipPath id="qr-logo-clip"><rect x="${r2(x0 + padM)}" y="${r2(x0 + padM)}" width="${r2(logoM)}" height="${r2(logoM)}" rx="${r2(logoM * 0.18)}"/></clipPath></defs>` +
        `<rect x="${r2(x0)}" y="${r2(x0)}" width="${r2(boxM)}" height="${r2(boxM)}" rx="${r2(boxM * 0.12)}" fill="#ffffff"/>` +
        `<image href="${dataUrl}" x="${r2(x0 + padM)}" y="${r2(x0 + padM)}" width="${r2(logoM)}" height="${r2(logoM)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#qr-logo-clip)"/>`;
      composed = str.replace(/<\/svg>\s*$/, `${overlay}</svg>`);
    } catch {
      // Logo unavailable — download the plain QR instead.
    }
    const blob = new Blob([composed], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tagly-qr.svg";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Share2 size={16} />
          <span className="hidden sm:inline">{triggerLabel}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your ordering link</DialogTitle>
          <DialogDescription>Share this link on Instagram, WhatsApp status, or your bio.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Link2 size={16} className="mr-1.5" /> Link
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode size={16} className="mr-1.5" /> QR code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="mt-4">
            <div className="flex gap-2">
              <Input readOnly value={url} onFocus={(e) => e.target.select()} />
              <Button variant="outline" onClick={onCopy} className="shrink-0">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="qr" className="mt-4">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-100 p-6">
              <div className="relative">
                <QRCode id="share-qr-svg" value={url} size={180} level="H" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-1.5 shadow-sm">
                  <Image
                    src="/Tagly.jpeg"
                    alt="Tagly logo"
                    width={80}
                    height={80}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                </div>
              </div>
              <p className="max-w-xs break-all text-center text-xs text-gray-500">{url}</p>
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download size={16} /> Download QR
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
