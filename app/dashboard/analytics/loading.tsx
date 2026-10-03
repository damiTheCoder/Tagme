import { SkeletonCards, SkeletonChart } from "@/components/dashboard/skeletons";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <SkeletonCards count={4} />
      <SkeletonChart />
      <SkeletonChart />
    </div>
  );
}
