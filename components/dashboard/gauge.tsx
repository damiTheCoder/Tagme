import type { LucideIcon } from "lucide-react";
import { IconBadge } from "./icon-badge";

const R = 52;
const CIRCUMFERENCE = Math.PI * R;

/** Semicircular gauge: purple → blue gradient fill on a light track. */
export function Gauge({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon?: LucideIcon;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="relative flex flex-col items-center px-6 pb-2 pt-8">
      {icon && (
        <span className="absolute left-6 top-6">
          <IconBadge icon={icon} variant="purple" />
        </span>
      )}
      <svg viewBox="0 0 120 68" className="w-full max-w-[220px]" role="img" aria-label={`${label}: ${pct} percent`}>
        <defs>
          <linearGradient id="gauge-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#006DFF" />
          </linearGradient>
        </defs>
        <path
          d={`M 8 60 A ${R} ${R} 0 0 1 112 60`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={`M 8 60 A ${R} ${R} 0 0 1 112 60`}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE.toFixed(1)}
          strokeDashoffset={(CIRCUMFERENCE * (1 - pct / 100)).toFixed(1)}
        />
      </svg>
      <p className="-mt-7 text-3xl font-semibold tabular-nums text-[#1a1a1a]">{pct}%</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
