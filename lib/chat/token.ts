import { createHmac, timingSafeEqual } from "node:crypto";

const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.CHAT_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "CHAT_TOKEN_SECRET is not set. Add it to .env.local (any random string, 32+ chars)."
    );
  }
  return secret;
}

function b64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

/**
 * Sign a conversation id into an opaque visitor token.
 * Format: base64url(`${conversationId}.${issuedAt}`) + "." + hmac
 */
export function signConversationToken(conversationId: string): string {
  const payload = b64urlEncode(`${conversationId}.${Date.now()}`);
  const sig = createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify a visitor token. Returns the conversation id, or null if invalid/expired.
 *  A missing CHAT_TOKEN_SECRET throws (misconfiguration) instead of
 *  returning null, so bad config is loud (500) rather than silent (401). */
export function verifyConversationToken(token: string): string | null {
  const secret = getSecret();
  try {
    if (typeof token !== "string" || !token) return null;
    const dot = token.lastIndexOf(".");
    if (dot <= 0) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const decoded = b64urlDecode(payload);
    const sep = decoded.lastIndexOf(".");
    if (sep <= 0) return null;
    const conversationId = decoded.slice(0, sep);
    const issuedAt = Number(decoded.slice(sep + 1));
    if (!Number.isFinite(issuedAt)) return null;
    if (Date.now() - issuedAt > EXPIRY_MS) return null;
    if (!conversationId) return null;
    return conversationId;
  } catch {
    return null;
  }
}
