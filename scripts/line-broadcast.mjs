#!/usr/bin/env node
// LINE 公式アカウントから、アプリ会員 (Supabase members) 全員にカード型メッセージを一斉送信する。
// .claude/skills/line-broadcast/SKILL.md から使う前提。手で使う場合も手順は同じ:
//
//   node scripts/line-broadcast.mjs check <card.json>   送らずに検証 (人数・残り通数・プレビュー)
//   node scripts/line-broadcast.mjs test  <card.json>   自分 (LINE_TEST_TO) にだけ送る
//   node scripts/line-broadcast.mjs send  <card.json> --expect <人数>   会員全員に送る
//   node scripts/line-broadcast.mjs quota               今月の残り通数だけ見る
//   node scripts/line-broadcast.mjs new-circulations    前回の回覧板お知らせ以降に追加された回覧板の一覧
//
// .env に必要なもの: LINE_TOKEN (or LINE_MESSAGING_CHANNEL_ACCESS_TOKEN) / LIFF_ID (or NEXT_PUBLIC_LIFF_ID) /
//                    LINE_TEST_TO / NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// トークンや userId は画面にもログにも出さない。

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOG_DIR = join(ROOT, ".line-broadcast");
const LOG_FILE = join(LOG_DIR, "sent.log");
const LINE_API = "https://api.line.me/v2/bot";
const MULTICAST_CHUNK = 500;
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const BRAND_GREEN = "#16a34a";

// ---------- env ----------
function loadEnv() {
  const file = join(ROOT, ".env");
  const env = { ...process.env };
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const quoted = m[2].match(/^(['"])(.*?)\1/);
      // 引用符なしの値は bash と同じく「空白 + #」以降を行末コメントとして捨てる
      env[m[1]] = quoted ? quoted[2] : m[2].replace(/\s+#.*$/, "").trim();
    }
  }
  // アプリ本体と同じ変数名で書かれていても使えるようにする
  env.LINE_TOKEN ||= env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  env.LIFF_ID ||= env.NEXT_PUBLIC_LIFF_ID;
  return env;
}

function requireEnv(env, keys) {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) fail(`.env に ${missing.join(", ")} がありません。`);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

// ---------- card → Flex Message ----------
// card.json:
// {
//   "label": "📜 回覧板",                 // 上部の小見出し (任意)
//   "title": "秋の一斉清掃のお知らせ",
//   "body": "10/20(日) 9:00〜 …",          // 本文 (任意)
//   "items": ["保護司だより", "…"],         // 箇条書き (任意。回覧板のまとめ通知などで使う)
//   "imageUrl": "https://…",               // 上部の写真 (任意・https のみ)
//   "button": { "label": "回覧板を開く", "path": "/circulation/xxxx" },
//   "altText": "…"                         // 通知一覧に出る文 (任意。省略時は label + title)
// }
function buildMessage(card, liffId) {
  if (!card.title) fail("card.json に title がありません。");
  if (!card.button?.label || !card.button?.path) {
    fail("card.json に button.label と button.path が必要です。");
  }
  if (!card.button.path.startsWith("/")) {
    fail("button.path は / から始まるアプリ内のパスにしてください (例: /circulation)。");
  }
  if (card.imageUrl && !card.imageUrl.startsWith("https://")) {
    fail("imageUrl は https:// で始まる URL にしてください。");
  }
  const uri = `https://liff.line.me/${liffId}${card.button.path}`;

  // header + backgroundColor や bubble size 指定は一部クライアントで
  // 「システムエラー」になった実績があるため、hero / body / footer のみで組む。
  const bodyContents = [];
  if (card.label) {
    bodyContents.push({ type: "text", text: card.label, size: "sm", color: BRAND_GREEN, weight: "bold" });
  }
  bodyContents.push({
    type: "text",
    text: card.title,
    weight: "bold",
    size: "lg",
    wrap: true,
    ...(card.label ? { margin: "md" } : {}),
  });
  if (card.body) {
    bodyContents.push({ type: "text", text: card.body, size: "sm", color: "#4b5563", wrap: true, margin: "md" });
  }
  if (card.items !== undefined) {
    if (!Array.isArray(card.items) || card.items.length === 0 || card.items.some((t) => typeof t !== "string" || !t)) {
      fail("items は空でない文字列の配列にしてください。");
    }
    bodyContents.push({ type: "separator", margin: "lg" });
    bodyContents.push({
      type: "box",
      layout: "vertical",
      margin: "lg",
      spacing: "sm",
      contents: card.items.map((text) => ({
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "●", size: "xxs", color: BRAND_GREEN, flex: 0 },
          { type: "text", text, size: "sm", color: "#1f2937", wrap: true },
        ],
      })),
    });
  }

  const bubble = {
    type: "bubble",
    ...(card.imageUrl
      ? {
          hero: {
            type: "image",
            url: card.imageUrl,
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover",
            action: { type: "uri", uri },
          },
        }
      : {}),
    body: { type: "box", layout: "vertical", contents: bodyContents },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: BRAND_GREEN,
          action: { type: "uri", label: card.button.label, uri },
        },
      ],
    },
  };

  const altText = (card.altText ?? [card.label, card.title].filter(Boolean).join(" ")).slice(0, 400);
  return { message: { type: "flex", altText, contents: bubble }, uri };
}

// ---------- LINE API ----------
async function lineFetch(env, path, init = {}) {
  const res = await fetch(`${LINE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.LINE_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // 本文が JSON でない場合はそのまま返す
  }
  return { ok: res.ok, status: res.status, json, text, requestId: res.headers.get("x-line-request-id") };
}

async function getQuota(env) {
  const [q, c] = await Promise.all([
    lineFetch(env, "/message/quota"),
    lineFetch(env, "/message/quota/consumption"),
  ]);
  if (!q.ok || !c.ok) fail(`残り通数の取得に失敗しました (HTTP ${q.status} / ${c.status})。LINE_TOKEN を確認してください。`);
  const limited = q.json.type === "limited";
  const used = c.json.totalUsage ?? 0;
  return { limited, limit: limited ? q.json.value : null, used, remaining: limited ? q.json.value - used : null };
}

async function validate(env, message) {
  const r = await lineFetch(env, "/message/validate/multicast", {
    method: "POST",
    body: JSON.stringify({ messages: [message] }),
  });
  if (!r.ok) {
    const details = (r.json?.details ?? []).map((d) => `  - ${d.property}: ${d.message}`).join("\n");
    fail(`LINE がメッセージ形式を受け付けませんでした (HTTP ${r.status}): ${r.json?.message ?? r.text}\n${details}`);
  }
}

// X-Line-Retry-Key を付けて送る。通信エラー時は同じキーで再送するので二重送信にならない。
async function postWithRetry(env, path, payload) {
  const retryKey = randomUUID();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await lineFetch(env, path, {
        method: "POST",
        headers: { "X-Line-Retry-Key": retryKey },
        body: JSON.stringify(payload),
      });
      // 409 = 同じリトライキーで受付済み (前回の送信は成功している)
      if (r.ok || r.status === 409) return { ok: true, requestId: r.requestId };
      if (r.status < 500) return { ok: false, error: `HTTP ${r.status} ${r.json?.message ?? r.text}` };
    } catch (err) {
      if (attempt === 3) return { ok: false, error: String(err) };
    }
    await new Promise((res) => setTimeout(res, 1000 * attempt));
  }
  return { ok: false, error: "再送しても失敗しました" };
}

// ---------- 宛先 (Supabase members) ----------
async function getRecipients(env) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/members?select=line_user_id`;
  const res = await fetch(url, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) fail(`members の取得に失敗しました (HTTP ${res.status})。Supabase の URL / キーを確認してください。`);
  const rows = await res.json();
  if (rows.length >= 1000) fail("members が 1000 件以上あります。ページ分割に対応していないので、スクリプトの修正が必要です。");
  return [...new Set(rows.map((r) => r.line_user_id).filter((id) => LINE_USER_ID_PATTERN.test(id)))];
}

const formatJst = (iso) =>
  new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// 前回「回覧板のお知らせ」を本番送信した日時 (sent.log から)。無ければ null
function lastCirculationSendAt() {
  if (!existsSync(LOG_FILE)) return null;
  let last = null;
  for (const line of readFileSync(LOG_FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.kind === "send" && e.path?.startsWith("/circulation") && e.sent > 0) last = e.at;
    } catch {
      // 壊れた行は無視
    }
  }
  return last;
}

async function listNewCirculations(env) {
  const since = lastCirculationSendAt();
  // 初回は直近 14 日 (アプリの「新着」表示と同じ期間) を候補にする
  const from = since ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const url =
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/circulations` +
    `?select=id,title,image_urls,created_at&created_at=gt.${encodeURIComponent(from)}&order=created_at.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) fail(`circulations の取得に失敗しました (HTTP ${res.status})。`);
  const rows = await res.json();
  console.log(
    since
      ? `前回の回覧板お知らせ (${formatJst(since)}) 以降に追加された回覧板: ${rows.length} 件`
      : `回覧板のお知らせ履歴がないため、直近 14 日に追加された回覧板: ${rows.length} 件`
  );
  for (const r of rows) {
    console.log(`  ${formatJst(r.created_at)}  ${r.title}  (id: ${r.id}, 写真 ${r.image_urls?.length ?? 0} 枚)`);
  }
}

// ---------- 表示 ----------
function printPreview(card, uri, message) {
  console.log("── プレビュー ──────────────────────────");
  if (card.imageUrl) console.log(`[写真] ${card.imageUrl}`);
  if (card.label) console.log(card.label);
  console.log(`■ ${card.title}`);
  if (card.body) console.log(card.body);
  for (const item of card.items ?? []) console.log(`  ● ${item}`);
  console.log(`[ ${card.button.label} ] → ${uri}`);
  console.log(`通知に出る文: ${message.altText}`);
  console.log("────────────────────────────────────");
}

function printQuota(q, need) {
  if (!q.limited) {
    console.log(`今月の送信数: ${q.used} 通 (上限なしのプラン)`);
    return;
  }
  console.log(`今月の送信数: ${q.used} / ${q.limit} 通 (残り ${q.remaining} 通)`);
  if (need != null) {
    const after = q.remaining - need;
    console.log(`今回の送信: 最大 ${need} 通 → 送信後の残り ${after} 通`);
    if (after < 0) console.log("⚠️ 残り通数が足りません。上限を超えた分は届きません。");
  }
}

function readCard(path) {
  if (!path) fail("card.json のパスを指定してください。");
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`card.json を読めませんでした: ${err.message}`);
  }
}

function log(entry) {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(LOG_FILE, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}

// ---------- commands ----------
async function main() {
  const [cmd, cardPath, ...rest] = process.argv.slice(2);
  const env = loadEnv();
  requireEnv(env, ["LINE_TOKEN"]);

  if (cmd === "quota") {
    printQuota(await getQuota(env));
    return;
  }

  if (cmd === "new-circulations") {
    requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
    await listNewCirculations(env);
    return;
  }

  if (!["check", "test", "send"].includes(cmd)) {
    fail("使い方: node scripts/line-broadcast.mjs <check|test|send|quota|new-circulations> <card.json> [--expect 人数]");
  }

  requireEnv(env, ["LIFF_ID"]);
  const card = readCard(cardPath);
  const { message, uri } = buildMessage(card, env.LIFF_ID);
  await validate(env, message);

  if (cmd === "test") {
    requireEnv(env, ["LINE_TEST_TO"]);
    if (!LINE_USER_ID_PATTERN.test(env.LINE_TEST_TO)) fail("LINE_TEST_TO が LINE の userId の形式ではありません。");
    printPreview(card, uri, message);
    const r = await postWithRetry(env, "/message/push", { to: env.LINE_TEST_TO, messages: [message] });
    if (!r.ok) fail(`テスト送信に失敗しました: ${r.error}`);
    log({ kind: "test", title: card.title, path: card.button.path, recipients: 1 });
    console.log("✅ テスト送信しました (LINE_TEST_TO の 1 人だけ)。LINE で見え方を確認してください。");
    return;
  }

  requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  const recipients = await getRecipients(env);
  const quota = await getQuota(env);

  if (cmd === "check") {
    printPreview(card, uri, message);
    console.log(`宛先: アプリ会員 ${recipients.length} 人 (公式アカウントを友だち追加していない人・ブロック中の人には届きません)`);
    printQuota(quota, recipients.length);
    console.log("✅ 形式チェック OK。まだ誰にも送っていません。");
    return;
  }

  // send: 確認した人数と今の人数が一致しない限り送らない (確認後に会員が増減した場合の事故防止)
  const expectIdx = rest.indexOf("--expect");
  const expected = expectIdx >= 0 ? Number(rest[expectIdx + 1]) : NaN;
  if (!Number.isInteger(expected)) fail("send には --expect <人数> が必要です (check で表示された人数)。");
  if (expected !== recipients.length) {
    fail(`宛先の人数が確認時 (${expected} 人) と変わっています (現在 ${recipients.length} 人)。check からやり直してください。`);
  }
  if (recipients.length === 0) fail("宛先が 0 人です。");
  if (quota.limited && quota.remaining < recipients.length) {
    fail(`残り通数 (${quota.remaining} 通) が宛先の人数 (${recipients.length} 人) より少ないため送信を中止しました。`);
  }

  let sent = 0;
  const errors = [];
  for (let i = 0; i < recipients.length; i += MULTICAST_CHUNK) {
    const chunk = recipients.slice(i, i + MULTICAST_CHUNK);
    const r = await postWithRetry(env, "/message/multicast", { to: chunk, messages: [message] });
    if (r.ok) sent += chunk.length;
    else errors.push(r.error);
  }
  log({ kind: "send", title: card.title, path: card.button.path, recipients: recipients.length, sent, errors });
  if (errors.length) fail(`一部の送信に失敗しました (成功 ${sent} / ${recipients.length} 人): ${errors.join(" / ")}`);
  console.log(`✅ アプリ会員 ${sent} 人に送信しました。`);
  printQuota(await getQuota(env));
}

main().catch((err) => fail(err?.stack ?? String(err)));
