"use client";

import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import {
  Card3D,
  Chat3D,
  Growth3D,
  Package3D,
  ShoppingBag3D,
} from "./capability-icons";

type CapabilityIconProps = {
  className?: string;
  style?: CSSProperties;
};

const PHRASES: {
  words: string[];
  icon: ComponentType<CapabilityIconProps>;
  label: string;
}[] = [
  { words: ["sells", "your", "products"], icon: ShoppingBag3D, label: "sells products" },
  { words: ["takes", "your", "orders"], icon: Package3D, label: "takes orders" },
  { words: ["answers", "your", "DMs"], icon: Chat3D, label: "answers DMs" },
  { words: ["collects", "payments"], icon: Card3D, label: "collects payments" },
  { words: ["grows", "your", "business"], icon: Growth3D, label: "grows your business" },
];

export function AscendHeadline() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
    }
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const hide = setTimeout(() => setVisible(false), 2100);
    const swap = setTimeout(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
      setVisible(true);
    }, 2450);

    return () => {
      clearTimeout(hide);
      clearTimeout(swap);
    };
  }, [index, reducedMotion]);

  const { words, icon: Icon } = PHRASES[index];

  return (
    <span className="block">
      <span
        key={index}
        aria-hidden
        className={`-mr-[1.06em] inline-flex flex-wrap items-center justify-center gap-x-[0.28em] transition-all duration-300 ${
          visible || reducedMotion ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        {words.map((word, i) => (
          <span
            key={`${index}-${i}`}
            className={reducedMotion ? undefined : "animate-ascend"}
            style={reducedMotion ? undefined : { animationDelay: `${i * 90}ms` }}
          >
            {word}
          </span>
        ))}
        <Icon
          className={`h-[0.82em] w-[0.82em] shrink-0 ${
            reducedMotion ? "" : "animate-ascend"
          }`}
          style={reducedMotion ? undefined : { animationDelay: `${words.length * 90}ms` }}
        />
      </span>
      <span className="sr-only">
        {PHRASES.map((p) => p.label).join(", ")} — Tagly, AI that understands your business.
      </span>
    </span>
  );
}
