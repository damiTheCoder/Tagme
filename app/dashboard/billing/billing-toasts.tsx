"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function BillingToasts() {
  const params = useSearchParams();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    if (params.get("success") === "1") toast.success("Subscription activated");
    else if (params.get("canceled") === "1") toast("Upgrade canceled");
  }, [params]);
  return null;
}
