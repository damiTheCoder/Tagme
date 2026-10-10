"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimation, useDragControls, type PanInfo } from "framer-motion";
import { ChatClient } from "./chat-client";
import type { CarouselProduct } from "./product-carousel";

export function ChatShell({
  businessName,
  businessSlug,
  initialProducts = [],
  initialInterest = null,
}: {
  businessName: string;
  businessSlug: string;
  initialProducts?: CarouselProduct[];
  initialInterest?: { name: string; publicId: string } | null;
}) {
  const initial = (businessName.trim().charAt(0) || "?").toUpperCase();
  const router = useRouter();
  const controls = useAnimation();
  const dragControls = useDragControls();
  const [dismissing, setDismissing] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
    update();
    const id = setInterval(update, 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    controls.start({ y: 0, opacity: 1, transition: { type: "spring", damping: 30, stiffness: 300 } });
    return () => {
      document.body.style.overflow = prev;
    };
  }, [controls]);

  async function onDragEnd(_: unknown, info: PanInfo) {
    if (dismissing) return;
    if (info.offset.y > 120) {
      setDismissing(true);
      await controls.start({ y: "100%", opacity: 0, transition: { duration: 0.25 } });
      router.back();
    } else {
      controls.start({ y: 0, transition: { type: "spring", damping: 30, stiffness: 300 } });
    }
  }

  return (
    <main
      className="fixed inset-0 z-50 bg-white bg-cover bg-center px-3 pt-4 dark:bg-zinc-950 sm:flex sm:items-end sm:justify-center sm:px-4 sm:pb-0 sm:pt-4"
      style={{ backgroundImage: "url('/page%20modal.jpeg')" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-neutral-950/60 backdrop-blur-[2px] sm:block"
      />
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={controls}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        onDragEnd={onDragEnd}
        className="modal-gradient-border-mobile relative flex h-full w-full flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-zinc-950 sm:h-[90dvh] sm:max-w-[420px] sm:rounded-[2.5rem] sm:border-[6px] sm:border-black sm:shadow-2xl"
      >
        {/* iPhone-style status bar */}
        <div className="flex shrink-0 items-center px-6 pt-6">
          <span className="w-16 text-sm font-semibold text-black dark:text-white">{time || "9:41"}</span>
          <span className="flex flex-1 justify-center" aria-hidden>
            <span className="flex h-[30px] w-24 items-center justify-end rounded-full bg-black">
              <span className="mr-2.5 h-2.5 w-2.5 rounded-full bg-[#101032] ring-1 ring-slate-700" />
            </span>
          </span>
          <span className="flex w-16 items-center justify-end gap-2 text-black dark:text-white" aria-hidden>
            <span className="flex items-end gap-[2.5px]">
              <span className="h-[5px] w-[3px] rounded-sm bg-black dark:bg-white" />
              <span className="h-[9px] w-[3px] rounded-sm bg-black dark:bg-white" />
              <span className="h-[13px] w-[3px] rounded-sm bg-black dark:bg-white" />
              <span className="h-[17px] w-[3px] rounded-sm bg-black dark:bg-white" />
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 20h.01" />
              <path d="M2 8.82a15 15 0 0 1 20 0" />
              <path d="M5 12.859a10 10 0 0 1 14 0" />
              <path d="M8.5 16.429a5 5 0 0 1 7 0" />
            </svg>
            <span className="flex items-center">
              <span className="flex h-[13px] w-[25px] items-center rounded-[4px] border border-black/80 p-[1.5px] dark:border-white/80">
                <span className="h-full w-3/4 rounded-[2px] bg-black dark:bg-white" />
              </span>
              <span className="ml-[1.5px] h-[7px] w-[2.5px] rounded-r-sm bg-black/80 dark:bg-white/80" />
            </span>
          </span>
        </div>
        <div
          className="flex cursor-grab touch-none justify-center pt-2 active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <span className="h-1 w-10 rounded-full bg-neutral-300" aria-hidden />
        </div>
        <header className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{businessName}</p>
            <p className="text-xs text-muted-foreground">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
              Online — replies instantly
            </p>
          </div>
        </header>
        <ChatClient
          businessSlug={businessSlug}
          businessName={businessName}
          initialProducts={initialProducts}
          initialInterest={initialInterest}
        />
      </motion.div>
    </main>
  );
}
