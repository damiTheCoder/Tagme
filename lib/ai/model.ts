import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const MODEL_ID = "gemini-2.5-flash";

export const chatModel = () => google(MODEL_ID);

// Assistant runs on Gemini directly (OpenRouter account is out of credits).
// Customer chat stays on chatModel(); do not change it.
export const ASSISTANT_MODEL_ID = "gemini-2.5-flash";

export const assistantModel = () => google(ASSISTANT_MODEL_ID);
