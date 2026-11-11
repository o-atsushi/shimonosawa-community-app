import type Anthropic from "@anthropic-ai/sdk";
import {
  type Usage,
  estimateCostUsd,
  getAiClient,
  isAiProviderConfigured,
  modelId,
  usageFromResponse,
} from "@/lib/ai-client";
import { supabaseAdmin } from "@/lib/supabase-admin";

// サーバー専用。デジタル回覧板の写真を AI が文字に起こし、AI相談の資料にする。
// 文字起こしは circulation_texts テーブル (RLS 有効・ポリシーなし = service role key でのみ読み書き) に保存する。

// 文字起こしに使うモデル。1 回覧板につき 1 回だけなので、読み取り精度を優先して上位モデルを既定にする。
const TEXT_MODEL = process.env.CIRCULATION_TEXT_MODEL || process.env.CHAT_MODEL || "claude-opus-5-5";

// AI相談の資料に入れる回覧板の範囲 (資料が増えるほど 1 質問の費用が上がるので絞る)
const KNOWLEDGE_MAX_CIRCULATIONS = 15;
const KNOWLEDGE_MAX_AGE_DAYS = 365;
const KNOWLEDGE_MAX_CHARS_PER_CIRCULATION = 2500;

// 「処理中」のまま止まった行 (関数のタイムアウトなど) をやり直し対象に戻すまでの時間
const STALE_PROCESSING_MS = 10 * 60 * 1000;

const IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];
// Claude API の画像 1 枚あたりの上限 (5MB)。アップロード側の上限 (4MB) より大きい
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type CirculationTextStatus = "processing" | "done" | "failed";

interface CirculationTextRow {
  circulation_id: string;
  status: CirculationTextStatus;
  content: string | null;
  model: string | null;
  cost_usd: number | string | null;
  error: string | null;
  updated_at: string;
}

export function isCirculationTextConfigured(): boolean {
  return !!supabaseAdmin && isAiProviderConfigured();
}

// 回覧板の画像は Supabase Storage の circulation-images バケットにあるものだけを読みに行く
// (DB に任意の URL が入っていてもサーバーから外部に取りに行かないように)
function allowedImagePrefix(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/circulation-images/`;
}

async function fetchImage(url: string): Promise<{ mediaType: ImageMediaType; data: string }> {
  const prefix = allowedImagePrefix();
  if (!prefix || !url.startsWith(prefix)) {
    throw new Error("回覧板の画像 URL が想定外の場所です");
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`画像の取得に失敗しました (HTTP ${res.status})`);
  const mediaType = (res.headers.get("content-type") ?? "").split(";")[0].trim() as ImageMediaType;
  if (!IMAGE_MEDIA_TYPES.includes(mediaType)) {
    throw new Error(`対応していない画像形式です (${mediaType || "不明"})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("画像が大きすぎます (5MB 超)");
  return { mediaType, data: buf.toString("base64") };
}

const TRANSCRIBE_INSTRUCTIONS = `あなたは自治会の「回覧板」の書類 (紙の書類をスマホで撮影した写真) を文字に起こす担当です。
文字に起こした内容は、住民からの質問に AI が答えるための資料になります。

ルール:
- 写真に写っている書類の文字を、内容を変えず、省略せずに書き起こしてください。要約や言い換えはしないでください。
- 日付・曜日・時刻・場所・金額・締切・持ち物・問い合わせ先 (市役所・団体) は特に正確に書き写してください。
- 表は「項目: 内容」の形の箇条書きにしてください。見出しは行頭に【】を付けてください。
- 読み取れない文字は [判読不能] と書き、推測で埋めないでください。
- 書類以外 (机・背景・指など) は無視してください。
- 個人の電話番号・個人宅の住所・個人のメールアドレスは [個人情報] に置き換えてください (市役所・学校・団体などの連絡先はそのまま書き写してください)。
- 前置き・説明・感想は書かず、書き起こした本文だけを出力してください。
- 書類の文字が写っていない写真の場合は「(文字なし)」とだけ出力してください。`;

async function transcribeImage(url: string): Promise<{ text: string; model: string; usage: Usage }> {
  const image = await fetchImage(url);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
    { type: "text", text: "この写真の書類を文字に起こしてください。" },
  ];
  const response = await getAiClient().beta.messages.create({
    model: modelId(TEXT_MODEL),
    max_tokens: 6000,
    system: TRANSCRIBE_INSTRUCTIONS,
    messages: [{ role: "user", content }],
    output_config: { effort: "low" },
  });
  if (response.stop_reason === "refusal") {
    throw new Error("AI がこの画像の文字起こしを断りました");
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return {
    text: response.stop_reason === "max_tokens" ? `${text}\n(以下、長いため省略)` : text,
    model: response.model,
    usage: usageFromResponse(response.usage),
  };
}

async function saveRow(circulationId: string, fields: Partial<Omit<CirculationTextRow, "circulation_id">>) {
  if (!supabaseAdmin) throw new Error("SUPABASE_SERVICE_ROLE_KEY が未設定です");
  const { error } = await supabaseAdmin
    .from("circulation_texts")
    .upsert({ circulation_id: circulationId, ...fields, updated_at: new Date().toISOString() });
  if (error) throw new Error(`circulation_texts への保存に失敗しました: ${error.message}`);
}

// 1 件の回覧板を文字起こしして保存する。失敗しても例外は投げず、status = failed で記録する
// (投稿 API の after() から呼ぶため、ここで落ちても投稿自体には影響させない)。
export async function transcribeCirculation(circulation: {
  id: string;
  imageUrls: string[];
}): Promise<CirculationTextStatus> {
  if (!isCirculationTextConfigured()) return "failed";
  try {
    await saveRow(circulation.id, { status: "processing", error: null });
    // 写真ごとに並行して文字起こしする (1 枚ずつ順番に待つと、枚数が多い時に関数の制限時間を超えるため)
    const pages = await Promise.all(circulation.imageUrls.map((url) => transcribeImage(url)));
    const content =
      pages.length === 1
        ? pages[0].text
        : pages.map((p, i) => `(${i + 1} 枚目)\n${p.text}`).join("\n\n");
    const costUsd = pages.reduce((sum, p) => sum + estimateCostUsd(p.model, p.usage), 0);
    await saveRow(circulation.id, {
      status: "done",
      content,
      model: pages[0]?.model ?? TEXT_MODEL,
      cost_usd: Number(costUsd.toFixed(6)),
      error: null,
    });
    return "done";
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    console.error("[circulation-texts] transcribe failed", circulation.id, message);
    try {
      await saveRow(circulation.id, { status: "failed", error: message });
    } catch (saveErr) {
      console.error("[circulation-texts] failed to record failure", saveErr);
    }
    return "failed";
  }
}

// ===== 役員画面用 =====

export interface CirculationTextForAdmin {
  id: string;
  title: string;
  createdAt: string;
  imageCount: number;
  // null = まだ文字起こししていない
  status: CirculationTextStatus | null;
  content: string | null;
  error: string | null;
  costUsd: number | null;
  updatedAt: string | null;
}

interface CirculationBaseRow {
  id: string;
  title: string;
  image_urls: string[] | null;
  created_at: string;
}

function needsTranscription(item: CirculationTextForAdmin, now = Date.now()): boolean {
  if (item.imageCount === 0) return false;
  if (item.status === null || item.status === "failed") return true;
  if (item.status === "processing" && item.updatedAt) {
    return now - new Date(item.updatedAt).getTime() > STALE_PROCESSING_MS;
  }
  return false;
}

export async function getCirculationTextsForAdmin(limit = 100): Promise<CirculationTextForAdmin[]> {
  if (!supabaseAdmin) throw new Error("SUPABASE_SERVICE_ROLE_KEY が未設定です");
  const { data: circs, error } = await supabaseAdmin
    .from("circulations")
    .select("id, title, image_urls, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`回覧板の取得に失敗しました: ${error.message}`);
  const rows = (circs ?? []) as CirculationBaseRow[];
  if (rows.length === 0) return [];

  const { data: texts, error: textError } = await supabaseAdmin
    .from("circulation_texts")
    .select("circulation_id, status, content, model, cost_usd, error, updated_at")
    .in(
      "circulation_id",
      rows.map((r) => r.id)
    );
  if (textError) throw new Error(`文字起こしの取得に失敗しました: ${textError.message}`);
  const byId = new Map(((texts ?? []) as CirculationTextRow[]).map((t) => [t.circulation_id, t]));

  return rows.map((r) => {
    const t = byId.get(r.id);
    return {
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      imageCount: Array.isArray(r.image_urls) ? r.image_urls.length : 0,
      status: t?.status ?? null,
      content: t?.content ?? null,
      error: t?.error ?? null,
      costUsd: t?.cost_usd == null ? null : Number(t.cost_usd),
      updatedAt: t?.updated_at ?? null,
    };
  });
}

// まだ文字起こししていない (または失敗した) 回覧板を、制限時間内で処理できる分だけ処理する。
// circulationId を指定すると、その 1 件を (済みでも) やり直す。
export async function transcribePendingCirculations(options: {
  circulationId?: string;
  timeBudgetMs: number;
}): Promise<{ processed: number; failed: number; remaining: number }> {
  if (!supabaseAdmin) throw new Error("SUPABASE_SERVICE_ROLE_KEY が未設定です");
  const startedAt = Date.now();

  let targets: { id: string; imageUrls: string[] }[];
  if (options.circulationId) {
    const { data, error } = await supabaseAdmin
      .from("circulations")
      .select("id, image_urls")
      .eq("id", options.circulationId)
      .maybeSingle();
    if (error) throw new Error(`回覧板の取得に失敗しました: ${error.message}`);
    targets = data ? [{ id: data.id, imageUrls: data.image_urls ?? [] }] : [];
  } else {
    const items = await getCirculationTextsForAdmin(200);
    const pendingIds = new Set(items.filter((i) => needsTranscription(i)).map((i) => i.id));
    if (pendingIds.size === 0) return { processed: 0, failed: 0, remaining: 0 };
    const { data, error } = await supabaseAdmin
      .from("circulations")
      .select("id, image_urls, created_at")
      .in("id", [...pendingIds])
      .order("created_at", { ascending: false });
    if (error) throw new Error(`回覧板の取得に失敗しました: ${error.message}`);
    targets = (data ?? []).map((d) => ({ id: d.id, imageUrls: d.image_urls ?? [] }));
  }

  let processed = 0;
  let failed = 0;
  for (const target of targets) {
    // 1 件の処理に最大 30 秒ほどかかるので、残り時間が足りなければ次の呼び出しに回す
    if (processed > 0 && Date.now() - startedAt > options.timeBudgetMs) break;
    const status = await transcribeCirculation(target);
    processed++;
    if (status === "failed") failed++;
  }
  return { processed, failed, remaining: Math.max(0, targets.length - processed) };
}

// ===== AI相談の資料用 =====

export async function getCirculationTextsForKnowledge(): Promise<
  { title: string; date: string; content: string }[]
> {
  if (!supabaseAdmin) return [];
  const since = new Date(Date.now() - KNOWLEDGE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: circs, error } = await supabaseAdmin
    .from("circulations")
    .select("id, title, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(KNOWLEDGE_MAX_CIRCULATIONS * 2);
  if (error) {
    console.error("[circulation-texts] load circulations failed", error);
    return [];
  }
  const rows = (circs ?? []) as { id: string; title: string; created_at: string }[];
  if (rows.length === 0) return [];
  const { data: texts, error: textError } = await supabaseAdmin
    .from("circulation_texts")
    .select("circulation_id, content")
    .eq("status", "done")
    .in(
      "circulation_id",
      rows.map((r) => r.id)
    );
  if (textError) {
    // テーブル未作成 (SQL 適用前) の場合もここに来る。AI相談自体は回覧板なしで動かす
    console.error("[circulation-texts] load circulation_texts failed", textError);
    return [];
  }
  const byId = new Map(
    ((texts ?? []) as { circulation_id: string; content: string | null }[]).map((t) => [
      t.circulation_id,
      t.content ?? "",
    ])
  );
  return rows
    .filter((r) => byId.get(r.id))
    .slice(0, KNOWLEDGE_MAX_CIRCULATIONS)
    .map((r) => {
      const content = byId.get(r.id) ?? "";
      return {
        title: r.title,
        date: new Date(r.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }),
        content:
          content.length > KNOWLEDGE_MAX_CHARS_PER_CIRCULATION
            ? `${content.slice(0, KNOWLEDGE_MAX_CHARS_PER_CIRCULATION)}…(以下省略。全文はアプリの回覧板の写真を確認)`
            : content,
      };
    });
}
