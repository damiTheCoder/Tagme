import { ChatClient } from "./chat-client";

export function ChatShell({
  businessName,
  businessSlug,
}: {
  businessName: string;
  businessSlug: string;
}) {
  const initial = (businessName.trim().charAt(0) || "?").toUpperCase();

  return (
    <main className="fixed inset-0 z-50 bg-white sm:flex sm:items-center sm:justify-center sm:bg-neutral-950/70 sm:p-4">
      <div className="flex h-[100dvh] w-full flex-col bg-white sm:h-[90dvh] sm:max-w-[420px] sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{businessName}</p>
            <p className="text-xs text-muted-foreground">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
              Online — replies instantly
            </p>
          </div>
        </header>
        <ChatClient businessSlug={businessSlug} businessName={businessName} />
      </div>
    </main>
  );
}
