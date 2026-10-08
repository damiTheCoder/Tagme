import { SkeletonCards, SkeletonTable } from "@/components/dashboard/skeletons";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
      <SkeletonCards count={3} />
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
