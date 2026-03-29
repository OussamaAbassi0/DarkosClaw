import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages, apiKey, provider, model } = await req.json();

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key is required. Configure it in Settings." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Provider base URLs
  const baseURLs: Record<string, string> = {
    groq: "https://api.groq.com/openai/v1",
    openrouter: "https://openrouter.ai/api/v1",
  };

  const defaultModels: Record<string, string> = {
    groq: "llama3-8b-8192",
    openrouter: "meta-llama/llama-3-8b-instruct:free",
  };

  const selectedProvider = provider || "groq";
  const baseURL = baseURLs[selectedProvider] || baseURLs.groq;
  const selectedModel = model || defaultModels[selectedProvider] || "llama3-8b-8192";

  const openai = createOpenAI({
    apiKey,
    baseURL,
    headers:
      selectedProvider === "openrouter"
        ? {
            "HTTP-Referer": "https://darkosclaw.local",
            "X-Title": "DarkosClaw",
          }
        : undefined,
  });

  const result = await streamText({
    model: openai(selectedModel),
    system:
      "You are DarkosClaw, a highly capable AI assistant with a sharp, direct personality. You provide expert-level answers, prefer concise responses, and are not afraid to be technical. You run on free LLM APIs and are proud of it.",
    messages,
  });

  return result.toDataStreamResponse();
}
