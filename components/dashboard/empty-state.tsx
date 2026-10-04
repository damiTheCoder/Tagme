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
    <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0066ff]">
        <Icon size={24} className="text-white" />
      </div>
      <p className="mt-4 text-base font-medium text-[#1a1a1a]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[#1a1a1a]/70">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
