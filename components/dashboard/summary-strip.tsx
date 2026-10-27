import type { LucideIcon } from "lucide-react";

export type SummaryStripItem = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

export function SummaryStrip({ items }: { items: SummaryStripItem[] }) {
  return (
    <div className="flex w-full flex-col divide-y divide-gray-200 dark:divide-zinc-800 sm:flex-row sm:divide-y-0 sm:divide-x sm:divide-gray-200 dark:sm:divide-zinc-800">
      {items.map((it) => {
        return (
          <div
            key={it.label}
            className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3"
          >
            <span
              className="truncate text-xs text-gray-500 dark:text-zinc-400 sm:text-sm"
              title={it.label}
            >
              {it.label}
            </span>
            <span
              className="break-words text-base font-semibold leading-snug tabular-nums text-[#1a1a1a] dark:text-zinc-100 sm:text-2xl"
              title={it.value}
            >
              {it.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
