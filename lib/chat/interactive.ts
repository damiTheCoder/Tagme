/**
 * Interactive (GUI-driven) message types for the bookend chat architecture.
 *
 * The AI owns only the intro and the conclusion of a transaction. Everything
 * in between — browsing, quantity, order confirmation, payment — is a rigid
 * message rendered from these shapes and answered by clicking, never by text.
 *
 * Deliberately shaped to survive a future WhatsApp port:
 *   - interactive-list  → WhatsApp `interactive` type `list`
 *     (sections of rows, each row carrying an opaque `id` the customer returns)
 *   - interactive-buttons → WhatsApp `interactive` type `button`
 *     (max 3 buttons, titles ≤ 20 chars — both limits honoured here)
 *   - payment-card → a normal content card (no WhatsApp equivalent)
 *
 * This module holds no server-only imports so the client can render history
 * from it as well as the routes that write it.
 */

/** WhatsApp caps a button title at 20 chars and a list at ~10 visible rows. */
export const MAX_BUTTONS = 3;
export const MAX_BUTTON_TITLE = 20;
export const MAX_LIST_ITEMS = 10;

/** Opaque reply ids, returned verbatim on click (exactly as WhatsApp does). */
export const reply = {
  selectProduct: (productId: string) => `select_product_${productId}`,
  qty: (n: number) => `qty_${n}`,
  customQty: () => `qty_custom`,
  payNow: () => `pay_now`,
  cancel: () => `cancel`,
} as const;

export type InteractiveListItem = {
  /** Reply id the customer sends back when they tap Select. */
  id: string;
  name: string;
  price: number;
  currency: string;
  image_url?: string | null;
  in_stock?: boolean;
  /** Public id (PRD-001…) echoed so the backend can resolve it. */
  public_id?: string | null;
};

export type InteractiveList = {
  type: "interactive-list";
  title: string;
  body?: string;
  items: InteractiveListItem[];
};

export type InteractiveButton = {
  /** Reply id. */
  id: string;
  title: string;
  style?: "primary" | "secondary";
};

export type InteractiveButtons = {
  type: "interactive-buttons";
  /** The question being asked, e.g. "How many?" */
  body: string;
  buttons: InteractiveButton[];
  /**
   * Context the backend needs when a button is clicked. Echoed back with the
   * reply id so a click is stateless — no server-side flow record required.
   */
  meta?: Record<string, string>;
  /**
   * When set, the client renders a numeric input instead of only buttons —
   * the "Custom" quantity path. Submits `qty_<n>` with the same meta.
   */
  custom_input?: { min: number; max: number; placeholder?: string };
};

export type PaymentCard = {
  type: "payment-card";
  order_id: string;
  account_number: string;
  account_name?: string | null;
  bank_name: string;
  /** Decimal string, e.g. "1500.00". */
  amount: string;
  currency: string;
  expires_at?: string | null;
  payment_reference?: string | null;
  charge_id?: string | null;
  checkout_id?: string | null;
};

export type InteractivePart = InteractiveList | InteractiveButtons | PaymentCard;

/** toolName used inside `messages.parts` for each kind. */
export const PART_TOOLNAME: Record<InteractivePart["type"], string> = {
  "interactive-list": "interactive-list",
  "interactive-buttons": "interactive-buttons",
  "payment-card": "payment-card",
};

/**
 * The AI tool's toolName. Its output carries the same `items` shape as an
 * interactive-list, so a live-streamed tool call and a reloaded history row
 * render identically.
 */
export const START_FLOW_TOOL = "start_shopping_flow";
export const COMPLETE_FLOW_TOOL = "complete_order_flow";

export function isInteractivePart(value: unknown): value is InteractivePart {
  if (!value || typeof value !== "object") return false;
  const t = (value as { type?: unknown }).type;
  return (
    t === "interactive-list" || t === "interactive-buttons" || t === "payment-card"
  );
}

type PersistedPart = { toolName?: unknown; output?: unknown };

/**
 * Pull every interactive part out of a persisted `messages.parts` array (or a
 * live UIMessage's parts). History rows store `{toolName, output}`; the live
 * stream stores `dynamic-tool` parts — both are accepted here.
 */
export function interactiveFromParts(parts: unknown): InteractivePart[] {
  const found: InteractivePart[] = [];
  if (!Array.isArray(parts)) return found;

  for (const raw of parts) {
    if (!raw || typeof raw !== "object") continue;

    // Live stream shape: { type: "dynamic-tool", toolName, output }
    const live = raw as { type?: string; toolName?: string; output?: unknown };
    const toolName =
      live.type === "dynamic-tool"
        ? live.toolName
        : typeof live.type === "string" && live.type.startsWith("tool-")
          ? live.type.slice("tool-".length)
          : undefined;

    // Persisted shape: { toolName, output }
    const stored = raw as PersistedPart;
    const name =
      typeof toolName === "string" ? toolName : typeof stored.toolName === "string" ? stored.toolName : null;
    if (!name) continue;

    const output = (live.output ?? stored.output) as Record<string, unknown> | null;
    if (!output || typeof output !== "object") continue;

    if (name === PART_TOOLNAME["interactive-list"] && isInteractivePart(output)) {
      found.push(output);
      continue;
    }
    if (name === PART_TOOLNAME["interactive-buttons"] && isInteractivePart(output)) {
      found.push(output);
      continue;
    }
    if (name === PART_TOOLNAME["payment-card"] && isInteractivePart(output)) {
      found.push(output);
      continue;
    }
    // The shopping-flow tool streamed live: rebuild a list from its output.
    if (name === START_FLOW_TOOL && Array.isArray(output.items)) {
      found.push({
        type: "interactive-list",
        title: typeof output.title === "string" ? output.title : "Pick a product",
        body: typeof output.body === "string" ? output.body : undefined,
        items: output.items as InteractiveListItem[],
      });
    }
  }
  return found;
}

/** Does this parts array contain the AI's closing message for `orderId`? */
export function hasConclusion(parts: unknown, orderId: string): boolean {
  return conclusionOrderId(parts) === orderId;
}

/**
 * Order id carried by an AI closing message, or null. This is what lets the
 * client's history poll recognise a webhook-written conclusion (which it did
 * not generate) and surface it live without mistaking a streamed reply for
 * one.
 */
export function conclusionOrderId(parts: unknown): string | null {
  if (!Array.isArray(parts)) return null;
  for (const raw of parts) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as PersistedPart & { type?: string; toolName?: string };
    const name = typeof p.toolName === "string" ? p.toolName : null;
    if (name !== COMPLETE_FLOW_TOOL) continue;
    const out = p.output as { order_id?: unknown } | null;
    if (out && typeof out.order_id === "string" && out.order_id) return out.order_id;
  }
  return null;
}

/** Enforce WhatsApp's 3-button / 20-char limits at the source. */
export function clampButtons(buttons: InteractiveButton[]): InteractiveButton[] {
  return buttons.slice(0, MAX_BUTTONS).map((b) => ({
    ...b,
    title: b.title.slice(0, MAX_BUTTON_TITLE),
  }));
}

/** Enforce WhatsApp's ~10-row list limit at the source. */
export function clampListItems(items: InteractiveListItem[]): InteractiveListItem[] {
  return items.slice(0, MAX_LIST_ITEMS);
}
