import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { getArticles } from "@/lib/api";
import { bodyExcerpt } from "@/lib/excerpt";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TASK_STATUS_LABELS, getTasks } from "@/lib/tasks";

// サーバー専用。AI相談 (/chat) の回答生成・ログ保存・資料読み込み。

export const CHAT_CATEGORIES = [
  "自治会の運営・規約",
  "会費・お金",
  "ごみ・清掃・環境",
  "防災・防犯",
  "行事・イベント",
  "市の手続き・制度",
  "土地開発・まちづくり",
  "近所・生活",
  "アプリの使い方",
  "その他",
] as const;
export type ChatCategory = (typeof CHAT_CATEGORIES)[number];

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

// "off": CHAT_MODEL だけで答える / "auto": まず CHAT_FAST_MODEL、自信が無ければ CHAT_MODEL /
// "user": 住民が「詳しい AI で答え直す」を押した (CHAT_MODEL で答える)
export type ChatRouting = "off" | "auto" | "user";

export interface ChatAnswer {
  answer: string;
  category: ChatCategory;
  answerable: boolean;
  // 最終的に回答したモデル
  model: string;
  // 最終的に回答したモデルのトークン数
  usage: Usage;
  provider: "anthropic" | "bedrock";
  routing: ChatRouting;
  // auto で上位モデルに回した時 true
  escalated: boolean;
  // 上位モデルに回した時、最初に答えたモデル
  firstModel: string | null;
  stopReason: string | null;
  knowledgeVersion: string;
  // 上位モデルに回した場合は 2 回分の合計 (目安)
  costUsd: number;
  latencyMs: number;
  // 住民に「詳しい AI で答え直す」ボタンを出してよいか
  canRetryDetailed: boolean;
}

export const CHAT_DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 20);
// アプリ全体での 1 日の上限 (なりすましで 1 人あたりの上限をすり抜けられても費用が青天井にならないように)
export const CHAT_GLOBAL_DAILY_LIMIT = Number(process.env.CHAT_GLOBAL_DAILY_LIMIT ?? 300);
export const CHAT_MAX_QUESTION_LENGTH = 500;
// 会話の続きとして送る過去ターン数の上限 (トークン量 = 費用 を抑える)
export const CHAT_MAX_HISTORY_TURNS = 6;

const PROVIDER = process.env.CHAT_PROVIDER === "bedrock" ? "bedrock" : "anthropic";
// 上位モデル (ROUTING=off の時はこれだけを使う)
const MODEL = process.env.CHAT_MODEL || "claude-opus-5-5";
// auto の時に最初に答える安いモデル
const FAST_MODEL = process.env.CHAT_FAST_MODEL || "claude-haiku-5-5";
const ROUTING: "off" | "auto" = process.env.CHAT_ROUTING === "off" ? "off" : "auto";
const EFFORT = (process.env.CHAT_EFFORT || "low") as "low" | "medium" | "high";

// 費用の目安 (100 万トークンあたりドル、Claude API の 2026-10 時点の価格)。
// Bedrock (グローバル) もほぼ同じ (Sonnet 5.5 のキャッシュ読みのみ半額)。
const PRICES: { match: string; input: number; output: number; cacheRead: number }[] = [
  { match: "opus", input: 4, output: 20, cacheRead: 0.2 },
  { match: "sonnet", input: 2, output: 10, cacheRead: 0.2 },
  { match: "haiku", input: 0.1, output: 0.5, cacheRead: 0.01 },
];

function estimateCostUsd(model: string, u: Usage): number {
  const p = PRICES.find((x) => model.includes(x.match)) ?? PRICES[0];
  return (
    (u.inputTokens * p.input +
      u.cacheWriteTokens * p.input * 1.25 +
      u.cacheReadTokens * p.cacheRead +
      u.outputTokens * p.output) /
    1_000_000
  );
}

export function isChatConfigured(): boolean {
  if (!supabaseAdmin) return false;
  if (PROVIDER === "bedrock") return !!(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION);
  return !!process.env.ANTHROPIC_API_KEY;
}

let anthropicClient: Anthropic | null = null;
let bedrockClient: AnthropicBedrockMantle | null = null;

function getClient(): Anthropic | AnthropicBedrockMantle {
  if (PROVIDER === "bedrock") {
    bedrockClient ??= new AnthropicBedrockMantle();
    return bedrockClient;
  }
  anthropicClient ??= new Anthropic();
  return anthropicClient;
}

// Bedrock はモデル ID に "anthropic." が付く
function modelId(model: string): string {
  if (PROVIDER === "bedrock" && !model.startsWith("anthropic.")) return `anthropic.${model}`;
  return model;
}

// ===== 資料 (system prompt) =====

const INSTRUCTIONS = `あなたは滋賀県野洲市「下ノ沢」地区の自治会 (新設準備中) の住民向けアプリに組み込まれた「AI相談窓口」です。
住民からの自治会・地域・野洲市に関する質問に、やさしい日本語で答えます。

回答のルール:
- 下に添付する「自治会の資料」と「アプリの最新お知らせ・課題」を最優先の根拠にしてください。資料同士で内容が違う場合は、日付が新しいものを優先し、そのことを一言添えてください。
- 資料に書かれていない自治会固有のこと (日程・金額・役員の判断・個別の事情) は推測で答えず、「資料には載っていないため、役員にお問い合わせください」と伝えてください。
- 野洲市の制度・手続き・ごみの分別など市のことは、一般的な知識で答えてよいですが、制度は変わることがあるため「最新情報は野洲市役所の窓口または公式サイト (https://www.city.yasu.lg.jp/) でご確認ください」と必ず添えてください。
- 個人を特定できる情報 (住民の名前・住所・連絡先など) は、資料に載っていても答えないでください。
- 回答は住民がスマホで読む前提で、要点から先に、300 字程度までを目安に簡潔に。箇条書きは使ってよいですが、見出しや表は使わないでください。
- 自治会・地域・市の話題と関係のない依頼 (文章作成、雑談の長いやりとりなど) には、この窓口の目的を伝えて丁寧にお断りしてください。

出力について:
- answer: 住民に表示する回答文
- category: 質問の分類 (最も近いもの 1 つ)
- answerable: 資料や一般知識で質問に十分答えられた場合は true。資料に答えがなく役員への確認が必要な場合、またはお断りした場合は false
- confident: 回答が正しいと確信できる場合は true。資料に答えが無いことがはっきりしている場合も true。資料の読み取りや解釈が難しい、複数の資料を突き合わせる必要がある、質問の意図があいまい、など回答に自信が無い場合は false`;

interface KnowledgeRow {
  title: string;
  content: string;
  source_updated_at: string | null;
}

const KNOWLEDGE_TTL_MS = 5 * 60 * 1000;
let knowledgeCache: { text: string; version: string; loadedAt: number } | null = null;

// 資料テキストはプロンプトキャッシュを効かせるため、内容が変わらない限り
// バイト単位で同じ文字列になるよう、並び順を固定して組み立てる。
// version は資料の内容から作る短いハッシュ (ログに残し、資料を足した前後の比較に使う)。
async function loadKnowledge(): Promise<{ text: string; version: string }> {
  if (knowledgeCache && Date.now() - knowledgeCache.loadedAt < KNOWLEDGE_TTL_MS) {
    return knowledgeCache;
  }

  const sections: string[] = [];

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("chat_knowledge")
      .select("title, content, source_updated_at")
      .eq("enabled", true)
      .order("title", { ascending: true });
    if (error) {
      console.error("[chat] load chat_knowledge failed", error);
    }
    for (const row of (data ?? []) as KnowledgeRow[]) {
      const date = row.source_updated_at ? `（更新日: ${row.source_updated_at.split("T")[0]}）` : "";
      sections.push(`<document title="${row.title}">\n${row.title}${date}\n\n${row.content}\n</document>`);
    }
  }

  try {
    const [news, events, life, tasks] = await Promise.all([
      getArticles("news"),
      getArticles("events"),
      getArticles("life"),
      getTasks(),
    ]);
    const articleLines = [...news, ...events, ...life]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)))
      .slice(0, 40)
      .map((a) => `- [${a.date}] ${a.title}: ${bodyExcerpt(a.body, 400)}`);
    const taskLines = tasks.map((t) => {
      const resolution = t.resolutionSummary ? ` / 決定内容: ${bodyExcerpt(t.resolutionSummary, 300)}` : "";
      return `- ${t.title}（${TASK_STATUS_LABELS[t.status]}）: ${bodyExcerpt(t.body, 300)}${resolution}`;
    });
    sections.push(
      `<document title="アプリの最新お知らせ・行事・生活情報">\n${articleLines.join("\n")}\n</document>`,
      `<document title="新設自治会の課題 (アプリの「新設課題」ページ)">\n${taskLines.join("\n")}\n</document>`
    );
  } catch (err) {
    console.error("[chat] load microCMS content failed", err);
  }

  const text = sections.length
    ? `# 自治会の資料\n\n${sections.join("\n\n")}`
    : "# 自治会の資料\n\n(資料はまだ登録されていません)";
  const version = createHash("sha256").update(text).digest("hex").slice(0, 12);
  knowledgeCache = { text, version, loadedAt: Date.now() };
  return knowledgeCache;
}

// ===== 回答生成 =====

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    category: { type: "string", enum: [...CHAT_CATEGORIES] },
    answerable: { type: "boolean" },
    confident: { type: "boolean" },
  },
  required: ["answer", "category", "answerable", "confident"],
  additionalProperties: false,
} as const;

interface ModelResult {
  answer: string;
  category: ChatCategory;
  answerable: boolean;
  confident: boolean;
  model: string;
  usage: Usage;
  stopReason: string | null;
}

async function askModel(
  model: string,
  history: ChatTurn[],
  question: string,
  knowledgeText: string
): Promise<ModelResult> {
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(-CHAT_MAX_HISTORY_TURNS).map((t) => ({ role: t.role, content: t.content })),
    // 日付は毎日変わるので system ではなく最後のメッセージに入れる (キャッシュを壊さない)
    { role: "user", content: `（今日の日付: ${today}）\n${question}` },
  ];

  const params = {
    model: modelId(model),
    max_tokens: 8000,
    system: [
      { type: "text" as const, text: INSTRUCTIONS },
      { type: "text" as const, text: knowledgeText, cache_control: { type: "ephemeral" as const } },
    ],
    messages,
    output_config: {
      effort: EFFORT,
      format: { type: "json_schema" as const, schema: OUTPUT_SCHEMA },
    },
  };

  const client = getClient();
  // Claude API ではサーバー側フォールバックを有効化 (安全フィルタで断られた時に別モデルで再試行)。
  // Bedrock ではこのパラメータが使えない。Haiku はサーバー側フォールバックの対象外なので付けない。
  const useFallback = PROVIDER === "anthropic" && !model.includes("haiku");
  const response = useFallback
    ? await client.beta.messages.create({
        ...params,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      })
    : await client.beta.messages.create(params);

  const usage: Usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
  };

  if (response.stop_reason === "refusal") {
    return {
      answer: "申し訳ありません、この質問にはお答えできません。役員に直接ご相談ください。",
      category: "その他",
      answerable: false,
      // お断りは上位モデルに回しても結果が変わらないことが多いので、確信ありとして扱う
      confident: true,
      model: response.model,
      usage,
      stopReason: response.stop_reason,
    };
  }

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let parsed: { answer?: unknown; category?: unknown; answerable?: unknown; confident?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[chat] failed to parse model output", model, response.stop_reason, text.slice(0, 200));
    throw new Error("AI の回答を読み取れませんでした");
  }
  const category = CHAT_CATEGORIES.includes(parsed.category as ChatCategory)
    ? (parsed.category as ChatCategory)
    : "その他";
  return {
    answer: typeof parsed.answer === "string" ? parsed.answer : "",
    category,
    answerable: parsed.answerable === true,
    // 項目が欠けていたら自信なし扱い (上位モデルに回す側に倒す)
    confident: parsed.confident === true,
    model: response.model,
    usage,
    stopReason: response.stop_reason ?? null,
  };
}

// mode: "normal" = 通常の質問 / "detailed" = 住民が「詳しい AI で答え直す」を押した
export async function generateAnswer(
  history: ChatTurn[],
  question: string,
  mode: "normal" | "detailed" = "normal"
): Promise<ChatAnswer> {
  const startedAt = Date.now();
  const knowledge = await loadKnowledge();
  const sameModel = FAST_MODEL === MODEL;

  const finish = (
    r: ModelResult,
    routing: ChatRouting,
    first: ModelResult | null
  ): ChatAnswer => ({
    answer: r.answer,
    category: r.category,
    answerable: r.answerable,
    model: r.model,
    usage: r.usage,
    provider: PROVIDER,
    routing,
    escalated: first !== null,
    firstModel: first?.model ?? null,
    stopReason: r.stopReason,
    knowledgeVersion: knowledge.version,
    costUsd: estimateCostUsd(r.model, r.usage) + (first ? estimateCostUsd(first.model, first.usage) : 0),
    latencyMs: Date.now() - startedAt,
    // 安いモデルだけで答えた時に限り、住民が上位モデルで答え直せる
    canRetryDetailed: routing === "auto" && first === null && !sameModel && r.stopReason !== "refusal",
  });

  if (mode === "detailed") {
    return finish(await askModel(MODEL, history, question, knowledge.text), "user", null);
  }
  if (ROUTING === "off" || sameModel) {
    return finish(await askModel(MODEL, history, question, knowledge.text), "off", null);
  }

  const fast = await askModel(FAST_MODEL, history, question, knowledge.text);
  if (fast.confident) return finish(fast, "auto", null);

  try {
    const strong = await askModel(MODEL, history, question, knowledge.text);
    return finish(strong, "auto", fast);
  } catch (err) {
    // 上位モデルが失敗しても、安いモデルの回答があればそれを返す
    console.error("[chat] escalation failed, falling back to fast model answer", err);
    return finish(fast, "auto", null);
  }
}

// ===== ログ =====

function startOfTodayJstIso(): string {
  // 日本時間の 0 時を UTC に直す
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const startJst = Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate());
  return new Date(startJst - 9 * 60 * 60 * 1000).toISOString();
}

// lineUserId を省略するとアプリ全体の件数。
// 失敗時は null (呼び出し側で「上限チェックできない = 受け付けない」に倒す)。
export async function countTodayQuestions(lineUserId?: string): Promise<number | null> {
  if (!supabaseAdmin) return null;
  let query = supabaseAdmin
    .from("chat_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfTodayJstIso());
  if (lineUserId) query = query.eq("line_user_id", lineUserId);
  const { count, error } = await query;
  if (error) {
    console.error("[chat] countTodayQuestions failed", error);
    return null;
  }
  return count ?? 0;
}

// 住民が「詳しい AI で答え直す」を押した時、元の回答が本人のもので、まだ答え直していないか確認する
export async function canRetryLog(logId: string, lineUserId: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from("chat_logs")
    .select("id, routing, escalated")
    .eq("id", logId)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error || !data) return false;
  if (data.routing !== "auto" || data.escalated) return false;
  const { count } = await supabaseAdmin
    .from("chat_logs")
    .select("id", { count: "exact", head: true })
    .eq("parent_log_id", logId);
  return (count ?? 0) === 0;
}

// どの環境で質問されたか。テスト環境 (Vercel のプレビュー) も本番と同じ Supabase に書き込むので、
// 役員のお試しの質問を本番の集計と分けるために記録する。
export const CHAT_ENVIRONMENT: "production" | "preview" | "development" =
  process.env.VERCEL_ENV === "production"
    ? "production"
    : process.env.VERCEL_ENV === "preview"
      ? "preview"
      : "development";

export async function insertChatLog(input: {
  lineUserId: string;
  sessionId: string;
  question: string;
  result: ChatAnswer;
  parentLogId?: string | null;
}): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("chat_logs")
    .insert({
      line_user_id: input.lineUserId,
      session_id: input.sessionId,
      question: input.question,
      answer: input.result.answer,
      category: input.result.category,
      answerable: input.result.answerable,
      model: input.result.model,
      input_tokens: input.result.usage.inputTokens,
      output_tokens: input.result.usage.outputTokens,
      cache_read_tokens: input.result.usage.cacheReadTokens,
      cache_write_tokens: input.result.usage.cacheWriteTokens,
      provider: input.result.provider,
      routing: input.result.routing,
      escalated: input.result.escalated,
      first_model: input.result.firstModel,
      parent_log_id: input.parentLogId ?? null,
      latency_ms: input.result.latencyMs,
      stop_reason: input.result.stopReason,
      knowledge_version: input.result.knowledgeVersion,
      cost_usd: Number(input.result.costUsd.toFixed(6)),
      environment: CHAT_ENVIRONMENT,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[chat] insertChatLog failed", error);
    return null;
  }
  return (data as { id: string }).id;
}

export async function setChatFeedback(
  logId: string,
  lineUserId: string,
  helpful: boolean
): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from("chat_logs")
    .update({ helpful })
    .eq("id", logId)
    .eq("line_user_id", lineUserId)
    .select("id");
  if (error) {
    console.error("[chat] setChatFeedback failed", error);
    return false;
  }
  return (data ?? []).length > 0;
}

export interface ChatLogForAdmin {
  id: string;
  sessionId: string;
  question: string;
  answer: string;
  category: string;
  answerable: boolean;
  helpful: boolean | null;
  createdAt: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  model: string;
  routing: string | null;
  escalated: boolean;
  isRetry: boolean;
  latencyMs: number | null;
  costUsd: number | null;
  environment: string;
}

// 役員画面用。投稿者が分からないよう line_user_id は返さない。
export async function getChatLogsForAdmin(sinceIso: string): Promise<ChatLogForAdmin[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("chat_logs")
    .select(
      "id, session_id, question, answer, category, answerable, helpful, created_at, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, model, routing, escalated, parent_log_id, latency_ms, cost_usd, environment"
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    question: r.question,
    answer: r.answer,
    category: r.category,
    answerable: r.answerable,
    helpful: r.helpful,
    createdAt: r.created_at,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    cacheReadTokens: r.cache_read_tokens,
    cacheWriteTokens: r.cache_write_tokens,
    model: r.model,
    routing: r.routing,
    escalated: r.escalated === true,
    isRetry: !!r.parent_log_id,
    latencyMs: r.latency_ms,
    // numeric 型は文字列で返ってくることがある
    costUsd: r.cost_usd == null ? null : Number(r.cost_usd),
    environment: r.environment ?? "production",
  }));
}
