"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

interface ChatLog {
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

// 本番の質問 / テスト環境 (役員のお試し) の質問 / すべて
type EnvFilter = "production" | "test" | "all";

// 費用の目安 (Claude API の 100 万トークンあたりドル。2026-10 時点)。
// サーバーで計算した cost_usd が無い古いログだけ、ここでトークン数から計算する。
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  opus: { input: 4, output: 20, cacheRead: 0.2 },
  sonnet: { input: 2, output: 10, cacheRead: 0.2 },
  haiku: { input: 0.1, output: 0.5, cacheRead: 0.01 },
};
const YEN_PER_DOLLAR = 155;

function estimateYen(log: ChatLog): number {
  if (log.costUsd != null) return log.costUsd * YEN_PER_DOLLAR;
  const key = Object.keys(PRICES).find((k) => log.model.includes(k)) ?? "opus";
  const p = PRICES[key];
  const dollars =
    (log.inputTokens * p.input +
      log.cacheWriteTokens * p.input * 1.25 +
      log.cacheReadTokens * p.cacheRead +
      log.outputTokens * p.output) /
    1_000_000;
  return dollars * YEN_PER_DOLLAR;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Filter = "all" | "unanswered" | "bad";

export default function AdminChatLogsPage() {
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  // LiffProvider が liff.init() 完了後にだけ描画するので、初期化時点でログイン判定できる
  const [status, setStatus] = useState<"loading" | "needs_login" | "forbidden" | "ready" | "error">(
    () => (isLoggedIn() ? "loading" : "needs_login")
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState<Filter>("all");
  // 初回取得時に、本番画面なら「本番」、テスト環境なら「テスト」を初期表示にする
  const [envFilter, setEnvFilter] = useState<EnvFilter | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then((profile) => {
      if (profile?.userId) setLineUserId(profile.userId);
      else setStatus("needs_login");
    }).catch(() => setStatus("needs_login"));
  }, []);

  useEffect(() => {
    if (!lineUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/chat-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId, days }),
        });
        if (cancelled) return;
        if (res.status === 403) {
          setStatus("forbidden");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg((data.error ?? "取得に失敗しました") + (data.detail ? `\n詳細: ${data.detail}` : ""));
          setStatus("error");
          return;
        }
        setLogs(data.logs ?? []);
        setEnvFilter((prev) => prev ?? (data.currentEnvironment === "production" ? "production" : "test"));
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setErrorMsg("通信エラーが発生しました");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lineUserId, days]);

  const envLogs = useMemo(
    () =>
      logs.filter((l) => {
        if (envFilter === "production") return l.environment === "production";
        if (envFilter === "test") return l.environment !== "production";
        return true;
      }),
    [logs, envFilter]
  );

  const summary = useMemo(() => {
    const logs = envLogs;
    const total = logs.length;
    const answered = logs.filter((l) => l.answerable).length;
    const good = logs.filter((l) => l.helpful === true).length;
    const bad = logs.filter((l) => l.helpful === false).length;
    const people = new Set(logs.map((l) => l.sessionId)).size;
    const yen = logs.reduce((s, l) => s + estimateYen(l), 0);
    const byCategory = new Map<string, number>();
    for (const l of logs) byCategory.set(l.category, (byCategory.get(l.category) ?? 0) + 1);
    const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    // 自動切り替えの対象になった質問 (答え直しを除く) のうち、上位モデルに回した割合
    const autoLogs = logs.filter((l) => l.routing === "auto");
    const escalated = autoLogs.filter((l) => l.escalated).length;
    const retries = logs.filter((l) => l.isRetry).length;
    const latencies = logs.map((l) => l.latencyMs).filter((v): v is number => v != null);
    const avgLatencySec = latencies.length
      ? latencies.reduce((s, v) => s + v, 0) / latencies.length / 1000
      : null;
    return {
      total,
      answered,
      good,
      bad,
      people,
      yen,
      categories,
      autoTotal: autoLogs.length,
      escalated,
      retries,
      avgLatencySec,
    };
  }, [envLogs]);

  const filtered = useMemo(
    () =>
      envLogs.filter((l) => {
        if (category && l.category !== category) return false;
        if (filter === "unanswered") return !l.answerable;
        if (filter === "bad") return l.helpful === false;
        return true;
      }),
    [envLogs, filter, category]
  );

  if (status === "loading") {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }
  if (status === "needs_login") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        LINE 経由でアプリを開いてください。
      </div>
    );
  }
  if (status === "forbidden") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        このページは役員のみ閲覧できます。
        <br />
        <Link href="/" className="underline">
          ← ホームに戻る
        </Link>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 whitespace-pre-wrap">
        {errorMsg}
      </div>
    );
  }

  const maxCount = summary.categories[0]?.[1] ?? 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-gray-800">🤖 AI相談の質問ログ</h1>
        <select
          id="chat-logs-days"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
        >
          <option value={7}>直近 7 日</option>
          <option value={30}>直近 30 日</option>
          <option value={90}>直近 90 日</option>
          <option value={365}>直近 1 年</option>
        </select>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {(
          [
            ["production", "本番の質問"],
            ["test", "テストの質問"],
            ["all", "すべて"],
          ] as [EnvFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setEnvFilter(key)}
            className={`text-xs px-3 py-1 rounded-full border ${
              envFilter === key ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        質問した人の名前は表示されません (匿名集計)。「テストの質問」は、テスト環境で役員が試した質問です。
      </p>
      <Link
        href="/admin/circulation-texts"
        className="block bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800"
      >
        📜 回覧板の文字起こし (AI が読んでいる内容) を確認する →
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="質問数" value={`${summary.total} 件`} sub={`会話 ${summary.people} 回分`} />
        <Stat
          label="AI が回答できた"
          value={summary.total ? `${Math.round((summary.answered / summary.total) * 100)}%` : "-"}
          sub={`${summary.answered} / ${summary.total} 件`}
        />
        <Stat label="住民の評価" value={`👍 ${summary.good}  👎 ${summary.bad}`} sub="評価された回答のみ" />
        <Stat label="AI の費用 (目安)" value={`約 ${Math.round(summary.yen).toLocaleString()} 円`} sub="Claude API 価格で計算" />
        <Stat
          label="上位の AI に回した"
          value={summary.autoTotal ? `${Math.round((summary.escalated / summary.autoTotal) * 100)}%` : "-"}
          sub={`自動 ${summary.escalated} 件 / 住民の答え直し ${summary.retries} 件`}
        />
        <Stat
          label="平均の応答時間"
          value={summary.avgLatencySec == null ? "-" : `${summary.avgLatencySec.toFixed(1)} 秒`}
          sub="質問してから回答が出るまで"
        />
      </div>

      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-2">分類別の件数 (タップで絞り込み)</h2>
        {summary.categories.length === 0 ? (
          <p className="text-sm text-gray-500">この期間の質問はまだありません。</p>
        ) : (
          <div className="space-y-1.5">
            {summary.categories.map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(category === cat ? null : cat)}
                className={`w-full text-left ${category === cat ? "ring-2 ring-green-500 rounded" : ""}`}
              >
                <div className="flex justify-between text-xs text-gray-700 mb-0.5">
                  <span>{cat}</span>
                  <span className="tabular-nums">{count} 件</span>
                </div>
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 bg-green-500 rounded" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ["all", "すべて"],
              ["unanswered", "AI が答えられなかった"],
              ["bad", "👎 が付いた"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1 rounded-full border ${
                filter === key ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
          {category && (
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="text-xs px-3 py-1 rounded-full border border-green-600 text-green-700 bg-green-50"
            >
              {category} ✕
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">該当する質問はありません。</p>
        ) : (
          filtered.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setOpenId(openId === l.id ? null : l.id)}
              className="block w-full text-left bg-white border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1 flex-wrap">
                <span>{formatDateTime(l.createdAt)}</span>
                <span className="bg-gray-100 rounded px-1.5">{l.category}</span>
                {l.environment !== "production" && (
                  <span className="bg-gray-800 text-white rounded px-1.5">テスト</span>
                )}
                {!l.answerable && <span className="bg-yellow-100 text-yellow-800 rounded px-1.5">未回答</span>}
                {l.escalated && <span className="bg-sky-100 text-sky-800 rounded px-1.5">上位 AI</span>}
                {l.isRetry && <span className="bg-sky-100 text-sky-800 rounded px-1.5">答え直し</span>}
                {l.helpful === true && <span>👍</span>}
                {l.helpful === false && <span>👎</span>}
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{l.question}</p>
              {openId === l.id && (
                <p className="mt-2 pt-2 border-t border-gray-100 text-sm text-gray-600 whitespace-pre-wrap break-words">
                  {l.answer}
                </p>
              )}
            </button>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-800 tabular-nums">{value}</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  );
}
