"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function orderDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ROW_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function levelClass(count: number, max: number): string {
  if (count === 0) return "bg-gray-100";
  const t = count / Math.max(1, max);
  if (t <= 0.25) return "bg-[#3d7a0a]/25";
  if (t <= 0.5) return "bg-[#3d7a0a]/50";
  if (t <= 0.75) return "bg-[#3d7a0a]/75";
  return "bg-[#3d7a0a]";
}

export function OrderCalendar({
  dates,
  selected,
  onSelect,
}: {
  dates: string[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const { weeks, counts, max, total } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const iso of dates) {
      const k = orderDayKey(new Date(iso));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday

    const weeks: (Date | null)[][] = [];
    let col: (Date | null)[] = [];
    const cur = new Date(start);
    while (cur <= today) {
      col.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      if (col.length === 7) {
        weeks.push(col);
        col = [];
      }
    }
    if (col.length > 0) {
      while (col.length < 7) col.push(null);
      weeks.push(col);
    }
    let max = 0;
    for (const n of counts.values()) max = Math.max(max, n);
    return { weeks, counts, max, total: dates.length };
  }, [dates]);

  const monthLabels = weeks.map((col, i) => {
    const first = col.find((d) => d !== null) as Date | undefined;
    if (!first) return "";
    if (i === 0) return MONTHS[first.getMonth()];
    const prevFirst = weeks[i - 1].find((d) => d !== null) as Date | undefined;
    if (prevFirst && prevFirst.getMonth() !== first.getMonth()) return MONTHS[first.getMonth()];
    return "";
  });

  const selectedLabel = selected
    ? new Date(selected + "T12:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-gray-500">
          {total} order{total === 1 ? "" : "s"} in the last 12 months — tap a day to filter
        </p>
        {selected && selectedLabel && (
          <button
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1 rounded-full bg-[#1a1a1a] px-2.5 py-0.5 text-xs font-semibold text-white"
          >
            {selectedLabel} <X size={12} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-[3px]">
          {/* Weekday gutter */}
          <div className="flex flex-col gap-[3px]">
            <span className="h-4" />
            {ROW_LABELS.map((label, r) => (
              <span key={r} className="flex h-3 items-center text-[10px] text-gray-500">
                {label}
              </span>
            ))}
          </div>
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              <span className="h-4 text-[10px] leading-4 text-gray-500">{monthLabels[ci]}</span>
              {col.map((day, ri) => {
                if (!day) return <span key={ri} className="h-3 w-3" />;
                const key = orderDayKey(day);
                const count = counts.get(key) ?? 0;
                const isSelected = selected === key;
                return (
                  <button
                    key={ri}
                    title={`${count} order${count === 1 ? "" : "s"} on ${key}`}
                    aria-label={`${count} orders on ${key}`}
                    onClick={() => onSelect(isSelected ? null : key)}
                    className={cn(
                      "h-3 w-3 rounded-[3px] transition-transform hover:scale-110",
                      levelClass(count, max),
                      isSelected && "outline outline-2 outline-offset-1 outline-[#1a1a1a]"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[3px] bg-gray-100" />
        <span className="h-3 w-3 rounded-[3px] bg-[#3d7a0a]/25" />
        <span className="h-3 w-3 rounded-[3px] bg-[#3d7a0a]/50" />
        <span className="h-3 w-3 rounded-[3px] bg-[#3d7a0a]/75" />
        <span className="h-3 w-3 rounded-[3px] bg-[#3d7a0a]" />
        <span>More</span>
      </div>
    </div>
  );
}
