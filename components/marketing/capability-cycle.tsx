"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CAPABILITIES } from "./capabilities";

type CapabilityCycle = {
  /** Index of the phrase currently on screen. */
  index: number;
  /** Whether the phrase is in its "up" position (it fades out before a swap). */
  visible: boolean;
  reducedMotion: boolean;
};

const CapabilityContext = createContext<CapabilityCycle>({
  index: 0,
  visible: true,
  reducedMotion: false,
});

/**
 * Single clock for the rotating headline. The headline and the backdrop photo
 * both read it, so the words and the image always swap together.
 */
export function CapabilityProvider({ children }: { children: ReactNode }) {
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

    const hide = setTimeout(() => setVisible(false), 2300);
    const swap = setTimeout(() => {
      setIndex((i) => (i + 1) % CAPABILITIES.length);
      setVisible(true);
    }, 2850);

    return () => {
      clearTimeout(hide);
      clearTimeout(swap);
    };
  }, [index, reducedMotion]);

  return (
    <CapabilityContext.Provider value={{ index, visible, reducedMotion }}>
      {children}
    </CapabilityContext.Provider>
  );
}

export function useCapabilityCycle(): CapabilityCycle {
  return useContext(CapabilityContext);
}
