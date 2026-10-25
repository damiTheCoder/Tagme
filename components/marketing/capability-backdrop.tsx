"use client";

import Image from "next/image";
import { CAPABILITIES } from "./capabilities";
import { useCapabilityCycle } from "./capability-cycle";

/**
 * Full-bleed photo behind the landing hero that swaps with the headline.
 *
 * Each photo carries its own treatment so the swap is all-or-nothing:
 * a black blend (slightly blurred at the very bottom) rises from the bottom
 * edge. Nothing washes the top of the photo.
 * Phrases without a photo fade everything out and the landing gradient shows
 * through again.
 */
export function CapabilityBackdrop() {
  const { index, reducedMotion } = useCapabilityCycle();
  const fade = reducedMotion
    ? "transition-none"
    : "transition-opacity duration-1000 ease-out";

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {CAPABILITIES.map((capability, i) => {
        if (!capability.image) return null;
        const active = i === index;

        return (
          <div
            key={capability.label}
            className={`absolute inset-0 ${fade} ${
              active ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={capability.image}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
            />
            {/* Black blended towards the top… */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/48 to-transparent" />
            {/* …and blurred across the bottom edge. */}
            <div className="absolute inset-x-0 bottom-0 h-[45%] bg-black/35 backdrop-blur-[3px] [mask-image:linear-gradient(to_top,black,transparent)]" />
          </div>
        );
      })}
    </div>
  );
}
