import { Badge } from "@/components/ui/badge";

export function OrderStatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge variant="green">approved</Badge>;
  if (status === "declined")
    return <Badge variant="gray">declined</Badge>;
  if (status === "fulfilled")
    return <Badge variant="default">fulfilled</Badge>;
  return <Badge variant="amber">pending</Badge>;
}
