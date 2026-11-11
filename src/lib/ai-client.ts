import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";

// サーバー専用。Claude (Claude API / Amazon Bedrock) の呼び出しに共通で使う設定・クライアント・費用計算。
// AI相談 (src/lib/chat.ts) と回覧板の文字起こし (src/lib/circulation-texts.ts) から使う。

export const AI_PROVIDER: "anthropic" | "bedrock" =
  process.env.CHAT_PROVIDER === "bedrock" ? "bedrock" : "anthropic";

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

// 費用の目安 (100 万トークンあたりドル、Claude API の 2026-10 時点の価格)。
// Bedrock (グローバル) もほぼ同じ (Sonnet 5.5 のキャッシュ読みのみ半額)。
const PRICES: { match: string; input: number; output: number; cacheRead: number }[] = [
  { match: "opus", input: 4, output: 20, cacheRead: 0.2 },
  { match: "sonnet", input: 2, output: 10, cacheRead: 0.2 },
  { match: "haiku", input: 0.1, output: 0.5, cacheRead: 0.01 },
];

export function estimateCostUsd(model: string, u: Usage): number {
  const p = PRICES.find((x) => model.includes(x.match)) ?? PRICES[0];
  return (
    (u.inputTokens * p.input +
      u.cacheWriteTokens * p.input * 1.25 +
      u.cacheReadTokens * p.cacheRead +
      u.outputTokens * p.output) /
    1_000_000
  );
}

export function isAiProviderConfigured(): boolean {
  if (AI_PROVIDER === "bedrock") return !!(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION);
  return !!process.env.ANTHROPIC_API_KEY;
}

let anthropicClient: Anthropic | null = null;
let bedrockClient: AnthropicBedrockMantle | null = null;

export function getAiClient(): Anthropic | AnthropicBedrockMantle {
  if (AI_PROVIDER === "bedrock") {
    bedrockClient ??= new AnthropicBedrockMantle();
    return bedrockClient;
  }
  anthropicClient ??= new Anthropic();
  return anthropicClient;
}

// Bedrock はモデル ID に "anthropic." が付く
export function modelId(model: string): string {
  if (AI_PROVIDER === "bedrock" && !model.startsWith("anthropic.")) return `anthropic.${model}`;
  return model;
}

export function usageFromResponse(u: Anthropic.Beta.BetaUsage): Usage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
}
