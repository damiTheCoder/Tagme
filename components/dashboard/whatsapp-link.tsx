import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/utils";

export function WhatsAppLink({ phone, name }: { phone: string | null | undefined; name?: string }) {
  const href = whatsappLink(phone);
  if (!href || !phone) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-[#3d7a0a] hover:underline"
    >
      <MessageCircle size={16} />
      <span>{name ?? phone}</span>
    </a>
  );
}
