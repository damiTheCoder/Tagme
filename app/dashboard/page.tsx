import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
import { LazyAssistantBar } from "@/components/dashboard/assistant/assistant-bar-lazy";

export default async function AssistantHomePage() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-6 md:py-10">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Hi, {business.name}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          Ask about your sales, orders, customers or stock — I&apos;ll pull the numbers from your shop.
        </p>
      </div>
      <LazyAssistantBar business={business} />
    </div>
  );
}
