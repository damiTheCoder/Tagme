import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await getCurrentBusiness();
  if (business) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step 1 of 2 · Business
        </p>
        <h1 className="mt-1 text-2xl font-bold">Set up your business</h1>
        <OnboardingForm />
      </div>
    </main>
  );
}
