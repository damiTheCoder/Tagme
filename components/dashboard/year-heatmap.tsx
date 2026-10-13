"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export type DayTotal = { date: string; total: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ROW_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function dayKey(d: Date): string {
  // UTC key — must match `settled_at.slice(0, 10)` (ISO UTC) used in
  // getDailyTotals and in the selected-day row filter. Local getters
  // shift days for UTC+X timezones and leave cells permanently gray.
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

const BLUE_LEVELS = [
  "bg-[#006DFF]/25",
  "bg-[#006DFF]/50",
  "bg-[#006DFF]/75",
  "bg-[#006DFF]",
] as const;

const RED_LEVELS = [
  "bg-[#f87171]/25",
  "bg-[#f87171]/50",
  "bg-[#f87171]/75",
  "bg-[#f87171]",
] as const;

export function YearHeatmap({
  daily,
  year,
  years,
  onYearChange,
  selected,
  onSelect,
  color,
  currency,
  noun,
}: {
  daily: DayTotal[];
  year: number;
  years: number[];
  onYearChange: (year: number) => void;
  selected: string | null;
  onSelect: (day: string | null) => void;
  color: "blue" | "red";
  currency: string;
  noun: string;
}) {
  const { weeks, totals, max, yearTotal } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of daily) totals.set(d.date, (totals.get(d.date) ?? 0) + d.total);

    // Sunday-aligned columns covering Jan 1 – Dec 31 of the year.
    // Built in UTC so keys line up with ISO `settled_at` dates.
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const dec31 = new Date(Date.UTC(year, 11, 31));
    const start = new Date(jan1);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(dec31);
    end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

    const weeks: (Date | null)[][] = [];
    let col: (Date | null)[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const inYear = cur.getUTCFullYear() === year;
      col.push(inYear ? new Date(cur) : null);
      cur.setUTCDate(cur.getUTCDate() + 1);
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
    let yearTotal = 0;
    for (const n of totals.values()) {
      max = Math.max(max, n);
      yearTotal += n;
    }
    return { weeks, totals, max, yearTotal };
  }, [daily, year]);

  const monthLabels = weeks.map((col, i) => {
    const first = col.find((d) => d !== null) as Date | undefined;
    if (!first) return "";
    if (i === 0) return MONTHS[first.getUTCMonth()];
    const prevFirst = weeks[i - 1].find((d) => d !== null) as Date | undefined;
    if (prevFirst && prevFirst.getUTCMonth() !== first.getUTCMonth())
      return MONTHS[first.getUTCMonth()];
    return "";
  });

  const levelClass = (total: number): string => {
    if (total <= 0) return "bg-gray-100 dark:bg-zinc-800";
    const levels = color === "red" ? RED_LEVELS : BLUE_LEVELS;
    const t = total / Math.max(1, max);
    if (t <= 0.25) return levels[0];
    if (t <= 0.5) return levels[1];
    if (t <= 0.75) return levels[2];
    return levels[3];
  };

  const selectedTotal = selected != null ? totals.get(selected) ?? 0 : 0;
  const selectedLabel = selected
    ? new Date(selected + "T12:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const money = (n: number) => formatCurrency(n, currency);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-gray-500">
          {money(yearTotal)} {noun} in {year} — tap a day to filter
        </p>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          aria-label="Select year"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {selected && selectedLabel && (
          <button
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1 rounded-full bg-[#1a1a1a] px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {selectedLabel} · {money(selectedTotal)} <X size={12} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-[3px]">
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
                const key = dayKey(day);
                const total = totals.get(key) ?? 0;
                const isSelected = selected === key;
                return (
                  <button
                    key={ri}
                    title={`${money(total)} on ${key}`}
                    aria-label={`${money(total)} on ${key}`}
                    onClick={() => onSelect(isSelected ? null : key)}
                    className={cn(
                      "h-3 w-3 rounded-[3px] transition-transform hover:scale-110",
                      levelClass(total),
                      isSelected && "outline outline-2 outline-offset-1 outline-[#1a1a1a] dark:outline-white"
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
        <span className="h-3 w-3 rounded-[3px] bg-gray-100 dark:bg-zinc-800" />
        {(color === "red" ? RED_LEVELS : BLUE_LEVELS).map((c) => (
          <span key={c} className={`h-3 w-3 rounded-[3px] ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
