"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChatClient } from "./chat-client";
import type { CarouselProduct } from "./product-carousel";

export function ChatShell({
  businessName,
  businessSlug,
  initialProducts = [],
  initialInterest = null,
  coverImageUrl = null,
}: {
  businessName: string;
  businessSlug: string;
  initialProducts?: CarouselProduct[];
  initialInterest?: { name: string; publicId: string } | null;
  /** Vendor graphics. Falls back to /ads.jpeg until the vendor uploads one. */
  coverImageUrl?: string | null;
}) {
  const [inChat, setInChat] = useState(false);

  // Lock page-level scroll: the conversation scrolls inside its own region
  // (ChatMessages) while the header and composer stay put.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {/* Vendor cover shown on the pre-chat landing screen; once the
          conversation starts it makes way so the chat fills the page. */}
      {!inChat && (
        <div className="relative h-56 shrink-0 overflow-hidden">
          <Image
            src={coverImageUrl ?? "/ads.jpeg"}
            alt={`${businessName} cover`}
            fill
            priority
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-zinc-950"
          />
        </div>
      )}
      <ChatClient
        businessSlug={businessSlug}
        businessName={businessName}
        initialProducts={initialProducts}
        initialInterest={initialInterest}
        onPhaseChange={(phase) => setInChat(phase === "chat")}
      />
    </main>
  );
}
