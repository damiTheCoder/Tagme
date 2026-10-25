/**
 * Shop header shown at the top of the chat.
 *
 * It is rendered by the skeleton, the identity form and the live chat so the
 * frame never jumps when the conversation data arrives.
 */
export function ChatHeader({ businessName }: { businessName: string }) {
  const initial = businessName.trim().charAt(0).toUpperCase() || "S";

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-black/[0.06] px-4 py-2.5 dark:border-white/10">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0866FF] via-[#4C8DFF] to-[#00C6FF] text-sm font-bold text-white shadow-sm"
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight text-black dark:text-zinc-50">
          {businessName}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-none text-muted-foreground">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          AI assistant
        </span>
      </span>
    </header>
  );
}
