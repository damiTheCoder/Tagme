import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7dd3fc20]">
        <Icon size={24} className="text-[#0c4a6e] dark:text-[#7dd3fc]" />
      </div>
      <p className="mt-4 text-base font-medium text-[#1a1a1a] dark:text-zinc-100">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[#1a1a1a]/70 dark:text-zinc-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
