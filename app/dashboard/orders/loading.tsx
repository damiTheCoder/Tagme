import { SkeletonTable } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-full max-w-xs" />
      <SkeletonTable rows={5} cols={3} />
    </div>
  );
}
