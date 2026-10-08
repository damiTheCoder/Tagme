import { NextResponse } from "next/server";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { assistantModel } from "@/lib/ai/model";
import { buildAssistantPrompt } from "@/lib/assistant/prompt";
import { createAssistantTools } from "@/lib/assistant/tools";

const MAX_MESSAGES = 30;
const RATE_LIMIT_PER_HOUR = 50;

// In-memory per-business throttle. Resets on server restart; matches the
// existing public-chat pattern (which throttles per conversation / IP).
const hits = new Map<string, number[]>();

function checkRateLimit(businessId: string): boolean {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const times = (hits.get(businessId) ?? []).filter((t) => t > windowStart);
  if (times.length >= RATE_LIMIT_PER_HOUR) {
    hits.set(businessId, times);
    return false;
  }
  times.push(now);
  hits.set(businessId, times);
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { messages } = (body ?? {}) as { messages?: unknown };

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not signed in." },
      { status: 401 }
    );
  }

  const business = await getCurrentBusiness();
  if (!business) {
    return NextResponse.json(
      { ok: false, error: "No business found." },
      { status: 404 }
    );
  }

  if (!checkRateLimit(business.id)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "You've used the assistant a lot this hour. Please take a short break and try again soon.",
      },
      { status: 429 }
    );
  }

  const incoming = Array.isArray(messages) ? (messages as UIMessage[]) : [];
  const capped = incoming.slice(-MAX_MESSAGES);
  const modelInput = capped.filter((m) => m?.role !== "system");

  const result = streamText({
    model: assistantModel(),
    maxOutputTokens: 2000,
    system: buildAssistantPrompt({
      id: business.id,
      name: business.name,
      currency: business.currency,
      slug: business.slug,
    }),
    messages: await convertToModelMessages(modelInput),
    tools: createAssistantTools({
      business: {
        id: business.id,
        name: business.name,
        currency: business.currency,
        slug: business.slug,
      },
    }),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
