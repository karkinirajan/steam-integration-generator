/**
 * The model providers the app can call. The list is fixed on purpose: the server only ever contacts these hosts, so a
 * request cannot point it at an arbitrary URL (no SSRF). OpenRouter alone reaches hundreds of models from most vendors.
 * Shared by the page (labels, hints) and the server (endpoints).
 */

type ProviderKind = "openai" | "anthropic" | "google" | "openai-compatible";

export type Provider = {
  id: string;
  label: string;
  kind: ProviderKind;
  /** Base URL of the provider's API (OpenAI and OpenAI-compatible providers). */
  baseURL?: string;
  /** Where to create a key, shown under the key field. */
  keyUrl: string;
  /** A model id to show as the placeholder. */
  exampleModel: string;
};

export const PROVIDERS = [
  { id: "openai", label: "OpenAI", kind: "openai", baseURL: "https://api.openai.com/v1", keyUrl: "https://platform.openai.com/api-keys", exampleModel: "gpt-5" },
  { id: "anthropic", label: "Anthropic", kind: "anthropic", keyUrl: "https://console.anthropic.com/settings/keys", exampleModel: "claude-sonnet-5-5" },
  { id: "google", label: "Google Gemini", kind: "google", keyUrl: "https://aistudio.google.com/app/apikey", exampleModel: "gemini-3.6-flash" },
  { id: "openrouter", label: "OpenRouter", kind: "openai-compatible", baseURL: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/keys", exampleModel: "openai/gpt-5" },
  { id: "groq", label: "Groq", kind: "openai-compatible", baseURL: "https://api.groq.com/openai/v1", keyUrl: "https://console.groq.com/keys", exampleModel: "llama-3.3-70b-versatile" },
  { id: "mistral", label: "Mistral", kind: "openai-compatible", baseURL: "https://api.mistral.ai/v1", keyUrl: "https://console.mistral.ai/api-keys", exampleModel: "mistral-large-latest" },
  { id: "deepseek", label: "DeepSeek", kind: "openai-compatible", baseURL: "https://api.deepseek.com/v1", keyUrl: "https://platform.deepseek.com/api_keys", exampleModel: "deepseek-chat" },
  { id: "xai", label: "xAI", kind: "openai-compatible", baseURL: "https://api.x.ai/v1", keyUrl: "https://console.x.ai", exampleModel: "grok-4" },
  { id: "together", label: "Together AI", kind: "openai-compatible", baseURL: "https://api.together.xyz/v1", keyUrl: "https://api.together.ai/settings/api-keys", exampleModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
] as const satisfies readonly Provider[];

export function findProvider(id: unknown): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

// Only a typo check on what was pasted; the provider decides whether a key or model is real.
const KEY_SHAPE = /^[A-Za-z0-9_.:\-]{16,512}$/;
const MODEL_SHAPE = /^[A-Za-z0-9_.:/@\-]{1,200}$/;

export function looksLikeApiKey(key: string | null | undefined): key is string {
  return key != null && KEY_SHAPE.test(key.trim());
}

export function looksLikeModelId(model: string | null | undefined): model is string {
  return model != null && MODEL_SHAPE.test(model.trim());
}
