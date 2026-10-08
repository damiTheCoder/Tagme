"use client";

import dynamic from "next/dynamic";

// Heavy client bundle (markdown + charts): excluded from the server
// render so the Overview page paints first, then hydrates.
export const LazyAssistantBar = dynamic(
  () => import("./assistant-bar").then((m) => m.AssistantBar),
  {
    ssr: false,
    loading: () => (
      <div className="h-[68px] animate-pulse rounded-2xl bg-gray-100" />
    ),
  }
);
