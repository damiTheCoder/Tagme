"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { approveOrder, declineOrder } from "./actions";
import { Button } from "@/components/ui/button";

export function OrderActions({ orderId, compact }: { orderId: string; compact?: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState<"approve" | "decline" | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  async function onApprove() {
    setWorking("approve");
    const result = await approveOrder(orderId);
    setWorking(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Order approved");
    router.refresh();
  }

  async function onDecline() {
    setWorking("decline");
    const result = await declineOrder(orderId, reason);
    setWorking(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Order declined");
    setDeclining(false);
    setReason("");
    router.refresh();
  }

  if (declining) {
    return (
      <div className="flex w-full flex-col gap-2">
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional, saved as a note)"
          className="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a8fe65]"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={onDecline} disabled={working !== null}>
            {working === "decline" && <Loader2 size={16} className="animate-spin" />}
            {working === "decline" ? "Declining…" : "Confirm decline"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDeclining(false);
              setReason("");
            }}
            disabled={working !== null}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button size="sm" onClick={onApprove} disabled={working !== null}>
        {working === "approve" && <Loader2 size={16} className="animate-spin" />}
        {working === "approve" ? "Approving…" : "Approve"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setDeclining(true)} disabled={working !== null}>
        Decline
      </Button>
    </>
  );
}
