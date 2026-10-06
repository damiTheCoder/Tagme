"use client";

import { useState } from "react";
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

  function onDownload() {
    const svg = document.getElementById("share-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const str = serializer.serializeToString(svg);
    const blob = new Blob([str], { type: "image/svg+xml" });
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
              <QRCode id="share-qr-svg" value={url} size={180} />
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
