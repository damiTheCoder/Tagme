import type { LucideIcon } from "lucide-react";

export type SummaryStripItem = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

/** Compact summary cards: 2x2 grid on mobile so figures are never
 *  truncated, 4-across strip on sm+. */
export function SummaryStrip({ items }: { items: SummaryStripItem[] }) {
  return (
    <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-300 dark:bg-zinc-700 sm:grid-cols-4">
      {items.map((it) => {
        return (
          <div
            key={it.label}
            className="flex min-w-0 flex-col gap-1 bg-gray-100 px-4 py-3 dark:bg-zinc-800"
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
