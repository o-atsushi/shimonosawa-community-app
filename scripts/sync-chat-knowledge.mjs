#!/usr/bin/env node
// AI相談 (/chat) が回答の根拠にする「AI用資料」を Supabase の chat_knowledge テーブルに同期する。
//
//   node scripts/sync-chat-knowledge.mjs           同期内容の確認だけ (書き込まない)
//   node scripts/sync-chat-knowledge.mjs --apply   knowledge/ フォルダの内容で chat_knowledge を置き換える
//   node scripts/sync-chat-knowledge.mjs list      いま登録されている資料の一覧
//
// knowledge/ フォルダ (git 管理外) に .md / .txt を置く。ファイル名がそのまま資料名になる。
// 本文の 1 行目を `更新日: 2026-11-28` にすると、その日付を資料の更新日として AI に伝える
// (書かなければファイルの更新日時)。
// リポジトリは公開なので、資料は絶対にコミットしないこと (.gitignore 済み)。
//
// .env に必要なもの: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KNOWLEDGE_DIR = join(ROOT, "knowledge");
// 日本語はおおよそ 1 文字 ≒ 1 トークン。これを超えると費用が大きくなるので警告する
const WARN_TOTAL_CHARS = 150_000;

function loadEnv() {
  const file = join(ROOT, ".env");
  const env = { ...process.env };
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const quoted = m[2].match(/^(['"])(.*?)\1/);
      env[m[1]] = quoted ? quoted[2] : m[2].replace(/\s+#.*$/, "").trim();
    }
  }
  return env;
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function readLocalDocs() {
  if (!existsSync(KNOWLEDGE_DIR)) fail(`knowledge/ フォルダがありません: ${KNOWLEDGE_DIR}`);
  const docs = [];
  for (const name of readdirSync(KNOWLEDGE_DIR).sort()) {
    const ext = extname(name).toLowerCase();
    if (ext !== ".md" && ext !== ".txt") continue;
    const path = join(KNOWLEDGE_DIR, name);
    let content = readFileSync(path, "utf8").replace(/\r\n/g, "\n").trim();
    let updatedAt = statSync(path).mtime.toISOString();
    const m = content.match(/^更新日[:：]\s*(\d{4}-\d{2}-\d{2})\s*\n/);
    if (m) {
      updatedAt = `${m[1]}T00:00:00+09:00`;
      content = content.slice(m[0].length).trim();
    }
    if (!content) continue;
    docs.push({ title: name.slice(0, -ext.length), content, source_updated_at: updatedAt });
  }
  return docs;
}

async function main() {
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    fail(".env に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。");
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: current, error } = await supabase
    .from("chat_knowledge")
    .select("id, title, content, enabled, source_updated_at")
    .order("title");
  if (error) fail(`chat_knowledge を読めませんでした: ${error.message}`);

  if (process.argv[2] === "list") {
    let total = 0;
    for (const row of current) {
      total += row.content.length;
      console.log(`${row.enabled ? "✅" : "⏸️ "} ${row.title}  (${row.content.length.toLocaleString()} 字)`);
    }
    console.log(`\n合計 ${current.length} 件 / ${total.toLocaleString()} 字`);
    return;
  }

  const docs = readLocalDocs();
  const byTitle = new Map(current.map((r) => [r.title, r]));
  const localTitles = new Set(docs.map((d) => d.title));
  const toAdd = docs.filter((d) => !byTitle.has(d.title));
  const toUpdate = docs.filter((d) => byTitle.has(d.title) && byTitle.get(d.title).content !== d.content);
  const toDelete = current.filter((r) => !localTitles.has(r.title));
  const totalChars = docs.reduce((s, d) => s + d.content.length, 0);

  console.log(`📂 knowledge/ の資料: ${docs.length} 件 / ${totalChars.toLocaleString()} 字`);
  for (const d of toAdd) console.log(`  ＋ 追加: ${d.title} (${d.content.length.toLocaleString()} 字)`);
  for (const d of toUpdate) console.log(`  ✎ 更新: ${d.title} (${d.content.length.toLocaleString()} 字)`);
  for (const r of toDelete) console.log(`  − 削除: ${r.title}`);
  if (!toAdd.length && !toUpdate.length && !toDelete.length) console.log("  変更はありません。");
  if (totalChars > WARN_TOTAL_CHARS) {
    console.log(
      `\n⚠️ 資料が ${WARN_TOTAL_CHARS.toLocaleString()} 字を超えています。1 回の質問の費用が大きくなるので、要らない資料を外すか要約してください。`
    );
  }

  if (!process.argv.includes("--apply")) {
    console.log("\n(確認のみ。書き込むには --apply を付けて実行)");
    return;
  }

  for (const d of [...toAdd, ...toUpdate]) {
    const { error: e } = await supabase
      .from("chat_knowledge")
      .upsert({ ...d, enabled: true, updated_at: new Date().toISOString() }, { onConflict: "title" });
    if (e) fail(`${d.title} の書き込みに失敗: ${e.message}`);
  }
  if (toDelete.length) {
    const { error: e } = await supabase
      .from("chat_knowledge")
      .delete()
      .in(
        "id",
        toDelete.map((r) => r.id)
      );
    if (e) fail(`削除に失敗: ${e.message}`);
  }
  console.log("\n✅ 同期しました。アプリへの反映は最大 5 分かかります。");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
