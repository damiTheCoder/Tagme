"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSend(text);
  }

  return (
    <div className="p-3">
      <div className="flex items-end gap-2">
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
          className="max-h-28 flex-1 resize-none overflow-y-auto rounded-2xl border-0 bg-gray-100 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50 dark:bg-zinc-800"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#0866FF] via-[#4C8DFF] to-[#00C6FF] text-white transition-opacity hover:opacity-90 disabled:bg-none disabled:bg-gray-200 disabled:text-gray-400"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}
