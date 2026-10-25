"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useAnimation, useDragControls, type PanInfo } from "framer-motion";
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
  const router = useRouter();
  const controls = useAnimation();
  const dragControls = useDragControls();
  const [dismissing, setDismissing] = useState(false);
  const [time, setTime] = useState("");
  const [inChat, setInChat] = useState(false);
  // The entrance runs as a plain CSS animation (so it starts with the first
  // paint, before hydration). Once it is done, Framer takes over the
  // transform for drag-to-dismiss.
  const [entered, setEntered] = useState(false);

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
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function onDragEnd(_: unknown, info: PanInfo) {
    if (dismissing) return;
    if (info.offset.y > 120) {
      setDismissing(true);
      await controls.start({
        y: "100%",
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.25 },
      });
      router.back();
    } else {
      controls.start({
        y: 0,
        scale: 1,
        transition: { type: "spring", damping: 30, stiffness: 300 },
      });
    }
  }

  return (
    <main
      className="fixed inset-0 z-50 h-[100dvh] overflow-hidden px-3 pt-4 sm:flex sm:items-end sm:justify-center sm:p-0 sm:pt-6"
      /* Final backdrop colour ships in the HTML, so the first paint never
         flashes white while the stylesheet and artwork load. */
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Backdrop artwork ships in the first paint — no white flash. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:bg-zinc-950"
        style={{ backgroundImage: "url('/page%20modal.jpeg?v=2')" }}
      />
      {/* Room dims as the modal arrives: transparent → dark over 200ms.
          Pure CSS so it starts with the first paint, before hydration. */}
      <div aria-hidden className="scrim absolute inset-0 bg-black scrim-in" />
      {/* Phone frame — the slide-in is CSS (first paint), Framer takes over
          once it has landed so drag-to-dismiss still works. */}
      <motion.div
        initial={false}
        animate={controls}
        onAnimationEnd={(e) => {
          if (e.animationName === "sheet-in") setEntered(true);
        }}
        onDragStart={() => setEntered(true)}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        onDragEnd={onDragEnd}
        className={`relative h-full w-full sm:h-[calc(100dvh-1.5rem)] sm:w-auto ${
          entered ? "" : "sheet-in"
        }`}
      >
        {/* Side buttons: silent switch + volume (left), power (right) */}
        <span
          aria-hidden
          className="absolute -left-[4px] top-24 h-8 w-[5px] rounded-l-md bg-gradient-to-b from-[#3a3a3c] to-black"
        />
        <span
          aria-hidden
          className="absolute -left-[5px] top-40 h-14 w-[6px] rounded-l-md bg-gradient-to-b from-[#3a3a3c] to-black"
        />
        <span
          aria-hidden
          className="absolute -left-[5px] top-[14.5rem] h-14 w-[6px] rounded-l-md bg-gradient-to-b from-[#3a3a3c] to-black"
        />
        <span
          aria-hidden
          className="absolute -right-[5px] top-48 h-20 w-[6px] rounded-r-md bg-gradient-to-b from-[#3a3a3c] to-black"
        />
        {/* Titanium frame */}
        <div className="flex h-full flex-col rounded-t-[3rem] bg-gradient-to-b from-[#3a3a3c] via-black to-[#3a3a3c] px-[8px] pt-[8px] shadow-2xl sm:mx-auto sm:w-[420px] sm:rounded-t-[3.5rem] sm:rounded-b-none">
          {/* Screen */}
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-[calc(3rem-8px)] bg-white dark:bg-zinc-950 sm:rounded-t-[calc(3.5rem-8px)] sm:rounded-b-none">
        {/* iPhone-style status bar (sits below the notch with viewport-fit=cover) */}
        <div className="flex shrink-0 items-center px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
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
        {!inChat && (
          <div className="relative mx-4 mt-1 h-56 shrink-0 overflow-hidden rounded-3xl">
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
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-12 backdrop-blur-[2px] [mask-image:linear-gradient(to_top,black,transparent)]"
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
          </div>
        </div>
      </motion.div>
    </main>
  );
}
