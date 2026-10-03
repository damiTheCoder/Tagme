import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { listProducts } from "./actions";
import { ProductsView } from "./products-view";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const result = await listProducts();
  if (!result.ok) throw new Error(result.error);

  return <ProductsView products={result.products} currency={business.currency} />;
}
