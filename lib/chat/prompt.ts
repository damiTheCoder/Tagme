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
  stock_count?: number | null;
  description?: string | null;
  details?: string | null;
};

function truncate(text: string | null | undefined, max: number): string | null {
  if (text == null) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) + "…" : trimmed;
}

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
      const stock = p.in_stock ? "In stock" : "Sold out";
      const extras = [
        truncate(p.description, 200),
        truncate(p.details, 200),
      ].filter((v): v is string => v != null);
      lines.push(
        `- ${p.name} — ${p.price} ${business.currency} — ${stock}${extras.length > 0 ? ` — ${extras.join(" | ")}` : ""}`
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
    `- Before quoting a product, verify it's in stock. If out of stock, tell the customer it's sold out and offer an alternative.`,
    `- When a customer asks about a product, use the description and details in the catalog to give a warm, helpful answer. Don't just quote the name and price — explain what it is, who it's for, and anything the vendor wrote that helps.`,
    `- If a customer asks a question the details don't answer, say so honestly and offer to check with the owner.`,
    `- Never invent facts about a product (ingredients, sizes, allergens, delivery times). Only state what's in the product's description or details.`,
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
