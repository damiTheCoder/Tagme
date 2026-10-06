"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimation, useDragControls, type PanInfo } from "framer-motion";
import { ChatClient } from "./chat-client";

export function ChatShell({
  businessName,
  businessSlug,
}: {
  businessName: string;
  businessSlug: string;
}) {
  const initial = (businessName.trim().charAt(0) || "?").toUpperCase();
  const router = useRouter();
  const controls = useAnimation();
  const dragControls = useDragControls();
  const [dismissing, setDismissing] = useState(false);

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
    <main className="fixed inset-0 z-50 bg-white px-3 pt-4 sm:flex sm:items-end sm:justify-center sm:bg-neutral-950/70 sm:px-4 sm:pb-0 sm:pt-4 sm:backdrop-blur-md">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={controls}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        onDragEnd={onDragEnd}
        className="modal-gradient-border-mobile flex h-full w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:h-[90dvh] sm:max-w-[420px] sm:shadow-2xl"
      >
        <div
          className="flex cursor-grab touch-none justify-center pt-2 active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <span className="h-1 w-10 rounded-full bg-neutral-300" aria-hidden />
        </div>
        <header className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white">
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
        <ChatClient businessSlug={businessSlug} businessName={businessName} />
      </motion.div>
    </main>
  );
}
