import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type LanguageModel } from "ai";

import type { Provider } from "../core/providers.ts";
import { describeError, GenerationError, NO_TEXT } from "./errors.ts";

/** The AI SDK model for a provider, key and model id. Server only: the key never leaves this process except to the provider. */
export function languageModel(provider: Provider, apiKey: string, modelId: string): LanguageModel {
  switch (provider.kind) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey, baseURL: provider.baseURL })(modelId);
    case "openai-compatible":
      // Other vendors speak OpenAI's Chat Completions API, not its newer Responses API.
      return createOpenAI({ apiKey, baseURL: provider.baseURL, name: provider.id }).chat(modelId);
  }
}

type StreamFn = (options: { model: LanguageModel; prompt: string; abortSignal?: AbortSignal; maxRetries?: number }) => {
  stream: AsyncIterable<{ type: string; text?: string; error?: unknown }>;
};

/**
 * Stream the answer in pieces. Every failure, including one raised mid-stream, becomes a GenerationError whose message is
 * written for the user and never contains the key. A stream with no visible text is reported as NO_TEXT.
 * `stream` is replaceable so tests can feed parts without a network.
 */
export async function* streamAnswer(
  provider: Provider,
  apiKey: string,
  modelId: string,
  prompt: string,
  signal?: AbortSignal,
  stream: StreamFn = streamText as unknown as StreamFn,
): AsyncGenerator<string> {
  let produced = false;
  try {
    const result = stream({ model: languageModel(provider, apiKey, modelId), prompt, abortSignal: signal, maxRetries: 1 });
    for await (const part of result.stream) {
      if (part.type === "text-delta" && part.text) {
        produced ||= part.text.trim().length > 0;
        yield part.text;
      } else if (part.type === "error") {
        throw part.error;
      }
    }
  } catch (error) {
    throw new GenerationError(describeError(error, provider, modelId, apiKey));
  }
  if (!produced) throw new GenerationError(NO_TEXT);
}
