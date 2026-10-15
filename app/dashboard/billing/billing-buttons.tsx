"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UpgradeButton({ label = "Upgrade to Pro" }: { label?: string }) {
  const [loading, setLoading] = useState(false);

  async function onUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/subscription", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok || typeof data.url !== "string") {
        toast.error(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={onUpgrade} disabled={loading}>
      {loading ? "Starting checkout…" : label}
    </Button>
  );
}

export function ManageButton() {
  return (
    <Button
      variant="outline"
      onClick={() => toast("Contact support to change or cancel your plan.")}
    >
      Manage Subscription
    </Button>
  );
}
