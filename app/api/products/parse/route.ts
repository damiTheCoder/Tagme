import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { chatModel } from "@/lib/ai/model";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

const MAX_TEXT_LENGTH = 8000;

const ParsedProductsSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      in_stock: z.boolean().optional(),
    })
  ),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { ok: false, error: "Text is required." },
      { status: 400 }
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "Text must be at most 8000 characters." },
      { status: 400 }
    );
  }

  try {
    const { object } = await generateObject({
      model: chatModel(),
      schema: ParsedProductsSchema,
      system:
        "You extract product data from a business owner's pasted text. The text could be a price list, a menu, a WhatsApp message, or a handwritten note transcribed to text. Extract every distinct product with its price. If no price is stated for an item, skip it. Do not invent products or prices. Keep descriptions short or omit them. Return only structured data.",
      prompt: text,
    });
    return NextResponse.json({ ok: true, products: object.products });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to parse products.",
      },
      { status: 500 }
    );
  }
}
