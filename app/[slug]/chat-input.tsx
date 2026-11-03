"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import Image from "next/image";

/**
 * Chat composer.
 *
 * It is sticky to the bottom of the screen and lifts itself above the on-screen
 * keyboard by tracking `visualViewport`: the layout viewport keeps its full
 * height while the keyboard covers the lower part of it, so the difference
 * between the two is exactly the keyboard inset.
 */
export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const overlap = window.innerHeight - viewport.height - viewport.offsetTop;
      // Ignore the few pixels of browser-chrome jitter so the composer
      // doesn't wobble while the URL bar collapses.
      setKeyboardInset(overlap > 60 ? overlap : 0);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSend(text);
  }

  return (
    <div
      className="sticky bottom-0 z-10 shrink-0 p-2"
      style={{
        paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
      }}
    >
      <div className="mx-3 flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-1.5 dark:bg-zinc-800">
        <Image
          src="/AI.jpeg"
          alt="AI"
          width={20}
          height={20}
          className="h-5 w-5 shrink-0 rounded-full"
        />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          className="max-h-28 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-0 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-yellow-400 text-white transition-opacity hover:opacity-90 disabled:bg-none disabled:bg-gray-200 disabled:text-gray-400"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}
