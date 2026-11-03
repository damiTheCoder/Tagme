import { Pacifico } from "next/font/google";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });

/**
 * Shop header shown at the top of the chat.
 *
 * It is rendered by the skeleton, the identity form and the live chat so the
 * frame never jumps when the conversation data arrives.
 */
export function ChatHeader({ businessName, businessSlug }: { businessName: string; businessSlug?: string }) {
  const initial = businessName.trim().charAt(0).toUpperCase() || "S";

  return (
    <header className="flex shrink-0 items-center gap-3 px-4 py-2.5">
      <span
        aria-hidden
        className={`${pacifico.className} flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0866FF] text-lg text-white shadow-sm`}
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight text-black dark:text-zinc-50">
          {businessName}
        </span>
      </span>
      {businessSlug ? (
        <Link
          href={`/${businessSlug}/shop`}
          className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-black dark:text-zinc-50"
        >
          <ShoppingCart className="h-4 w-4" />
          View shop
        </Link>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-black dark:text-zinc-50">
          <ShoppingCart className="h-4 w-4" />
          View shop
        </span>
      )}
    </header>
  );
}
