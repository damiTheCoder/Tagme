import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-16 w-3/4" />
      </div>
      <div className="space-y-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
