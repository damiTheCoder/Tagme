export type PromptBusiness = {
  name: string;
  description: string | null;
  hours: string | null;
  policies: string | null;
  currency: string;
};

export type PromptProduct = {
  name: string;
  price: number | string;
  in_stock: boolean;
};

export function buildSystemPrompt(
  business: PromptBusiness,
  products: PromptProduct[],
  customerName?: string | null
): string {
  const lines = [
    `You are the friendly shop assistant for "${business.name}", a small business taking orders via chat.`,
    `Keep replies short, warm, and human — like a helpful shopkeeper. Reply in the customer's language.`,
    "",
    `Business info:`,
    `- Description: ${business.description || "—"}`,
    `- Hours: ${business.hours || "—"}`,
    `- Policies: ${business.policies || "—"}`,
    `- Currency: ${business.currency}`,
    "",
    `Catalog snapshot (name — price — stock):`,
  ];
  if (products.length === 0) {
    lines.push(`- (no products listed yet)`);
  } else {
    for (const p of products.slice(0, 100)) {
      lines.push(
        `- ${p.name} — ${p.price} ${business.currency}${p.in_stock ? "" : " (out of stock)"}`
      );
    }
  }
  lines.push(
    "",
    `Rules:`,
    `- Only quote prices from search_products or the catalog snapshot above. Never invent prices.`,
    `- Use search_products for accuracy before quoting a price, especially when unsure.`,
    `- When a customer wants to order, confirm the items and total with them first, then call create_order.`,
    `- After create_order succeeds, tell them: "I've sent your order to ${business.name} for confirmation. You'll see an update here shortly."`,
    `- Never say an order is "confirmed" or "placed" — the owner approves orders.`,
    `- If a product is out of stock, say so and suggest alternatives.`,
    `- If unsure about anything, call escalate_to_owner.`,
    `- Currency is ${business.currency}.`
  );
  const trimmedName = customerName?.trim();
  if (trimmedName) {
    lines.push(
      `You're speaking with ${trimmedName}. Use their name occasionally, not every message.`
    );
  }
  return lines.join("\n");
}
