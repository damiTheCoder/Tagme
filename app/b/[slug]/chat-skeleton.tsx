import { ChatHeader } from "./chat-header";

/**
 * First-paint shell for /b/[slug].
 *
 * It is server-rendered inside the phone frame, so the customer sees the shop
 * header, a shimmering message area and a disabled composer from the very
 * first frame instead of an empty page while the conversation loads.
 */
export function ChatSkeleton({ businessName }: { businessName: string }) {
  return (
    <>
      <ChatHeader businessName={businessName} />

      <div
        aria-hidden
        className="min-h-0 flex-1 overflow-hidden px-4 py-4"
      >
        <div className="flex flex-col gap-3">
          <div className="shimmer h-14 w-[72%] rounded-2xl rounded-bl-md" />
          <div className="shimmer h-9 w-[46%] self-end rounded-2xl rounded-br-md" />
          <div className="shimmer h-20 w-[82%] rounded-2xl rounded-bl-md" />
        </div>
      </div>

      <div className="shrink-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2" aria-hidden>
          <div className="shimmer h-9 flex-1 rounded-2xl" />
          <div className="shimmer h-8 w-8 shrink-0 rounded-full" />
        </div>
        <span className="sr-only">Opening the shop…</span>
      </div>
    </>
  );
}
