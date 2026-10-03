import { createAdminClient } from "@/lib/supabase/admin";
import { ChatShell } from "./chat-shell";

export default async function PublicChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 p-8">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold">This link is not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The shop you&apos;re looking for doesn&apos;t exist or the link is
            incorrect.
          </p>
        </div>
      </main>
    );
  }

  return <ChatShell businessName={business.name} businessSlug={business.slug} />;
}
