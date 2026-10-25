"use client";

import type { CSSProperties } from "react";
import { CAPABILITIES } from "./capabilities";
import { useCapabilityCycle } from "./capability-cycle";

type CapabilityIconProps = {
  className?: string;
  style?: CSSProperties;
};

export function AscendHeadline() {
  const { index, visible, reducedMotion } = useCapabilityCycle();

  const { words, icon: Icon } = CAPABILITIES[index];

  return (
    <span className="block">
      <span
        key={index}
        aria-hidden
        className={`-mr-[1.06em] inline-flex flex-wrap items-center justify-center gap-x-[0.28em] transition-all duration-500 ${
          visible || reducedMotion ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        {words.map((word, i) => (
          <span
            key={`${index}-${i}`}
            className={reducedMotion ? undefined : "animate-ascend"}
            style={reducedMotion ? undefined : { animationDelay: `${i * 120}ms` }}
          >
            {word}
          </span>
        ))}
        <Icon
          className={`h-[0.82em] w-[0.82em] shrink-0 ${
            reducedMotion ? "" : "animate-ascend"
          }`}
          style={reducedMotion ? undefined : { animationDelay: `${words.length * 120}ms` }}
        />
      </span>
      <span className="sr-only">
        {CAPABILITIES.map((p) => p.label).join(", ")} — Tagly, AI that understands your business.
      </span>
    </span>
  );
}
