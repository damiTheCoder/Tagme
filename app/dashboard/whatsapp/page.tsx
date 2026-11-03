import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { WhatsAppConnect } from "./whatsapp-client";

export default async function WhatsAppPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">WhatsApp</h1>
      <p className="text-sm text-muted-foreground">
        Connect your WhatsApp Business account to receive and reply to messages.
      </p>
      <WhatsAppConnect />
    </div>
  );
}
