import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const MODEL_ID = "openrouter/free";

export const chatModel = () => openrouter(MODEL_ID);
