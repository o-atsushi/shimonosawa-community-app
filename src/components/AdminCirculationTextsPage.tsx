"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

interface Item {
  id: string;
  title: string;
  createdAt: string;
  imageCount: number;
  status: "processing" | "done" | "failed" | null;
  content: string | null;
  error: string | null;
  costUsd: number | null;
  updatedAt: string | null;
}

const YEN_PER_DOLLAR = 155;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  done: { label: "文字起こし済み", className: "bg-green-100 text-green-800" },
  processing: { label: "処理中", className: "bg-sky-100 text-sky-800" },
  failed: { label: "失敗", className: "bg-red-100 text-red-700" },
  none: { label: "未処理", className: "bg-yellow-100 text-yellow-800" },
};

export default function AdminCirculationTextsPage() {
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  // LiffProvider が liff.init() 完了後にだけ描画するので、初期化時点でログイン判定できる
  const [status, setStatus] = useState<"loading" | "needs_login" | "forbidden" | "ready" | "error">(
    () => (isLoggedIn() ? "loading" : "needs_login")
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  // 実行中の対象 ("all" = 未処理をまとめて / 回覧板 id = その 1 件をやり直し)
  const [running, setRunning] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then((profile) => {
      if (profile?.userId) setLineUserId(profile.userId);
      else setStatus("needs_login");
    }).catch(() => setStatus("needs_login"));
  }, []);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/circulation-texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    },
    [lineUserId]
  );

  const load = useCallback(async () => {
    try {
      const { res, data } = await post({ action: "list" });
      if (res.status === 403) {
        setStatus("forbidden");
        return;
      }
      if (!res.ok) {
        setErrorMsg((data.error ?? "取得に失敗しました") + (data.detail ? `\n詳細: ${data.detail}` : ""));
        setStatus("error");
        return;
      }
      setItems(data.items ?? []);
      setStatus("ready");
    } catch {
      setErrorMsg("通信エラーが発生しました");
      setStatus("error");
    }
  }, [post]);

  useEffect(() => {
    if (!lineUserId) return;
    void load();
  }, [lineUserId, load]);

  // target: "all" = 未処理・失敗をまとめて / 回覧板 id = その 1 件をやり直す
  async function run(target: string) {
    setRunning(target);
    setRunMessage(null);
    let processed = 0;
    let failed = 0;
    try {
      // サーバー側の 1 回の制限時間内で終わらない分は、残りが 0 になるまで繰り返し呼ぶ
      for (let i = 0; i < 30; i++) {
        const { res, data } = await post(target === "all" ? { action: "run" } : { action: "run", circulationId: target });
        if (!res.ok) {
          setRunMessage((data.error ?? "実行に失敗しました") + (data.detail ? `\n詳細: ${data.detail}` : ""));
          break;
        }
        processed += data.processed ?? 0;
        failed += data.failed ?? 0;
        if (target !== "all" || !data.remaining || !data.processed) {
          setRunMessage(
            processed === 0
              ? "文字起こしが必要な回覧板はありません。"
              : `${processed} 件を処理しました${failed ? ` (うち ${failed} 件は失敗。下の一覧で理由を確認してください)` : ""}。`
          );
          break;
        }
      }
    } catch {
      setRunMessage("通信エラーが発生しました。もう一度押すと続きから処理します。");
    } finally {
      setRunning(null);
      await load();
    }
  }

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

  const doneCount = items.filter((i) => i.status === "done").length;
  const pendingCount = items.filter((i) => i.imageCount > 0 && (i.status === null || i.status === "failed")).length;
  const totalYen = items.reduce((s, i) => s + (i.costUsd ?? 0) * YEN_PER_DOLLAR, 0);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/chat-logs" className="text-xs text-green-700 underline">
          ← 質問ログに戻る
        </Link>
        <h1 className="text-lg font-bold text-gray-800 mt-1">📜 回覧板の文字起こし</h1>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">
        回覧板の写真を AI が文字に起こしたものです。AI相談は、この文字をもとに回覧板の内容に答えます
        (新しい順に最大 15 件・1 年以内・1 件 2,500 字まで)。新しく投稿した回覧板は、投稿後 1 分ほどで自動的に文字起こしされます。
      </p>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="文字起こし済み" value={`${doneCount} 件`} />
        <Stat label="未処理・失敗" value={`${pendingCount} 件`} />
        <Stat label="費用 (目安)" value={`約 ${Math.round(totalYen).toLocaleString()} 円`} />
      </div>

      <button
        type="button"
        onClick={() => run("all")}
        disabled={running !== null || pendingCount === 0}
        className="w-full bg-green-600 text-white text-sm font-bold rounded-lg py-2.5 disabled:bg-gray-300"
      >
        {running === "all"
          ? "文字起こし中... (1 件 30 秒ほど。画面を閉じないでください)"
          : `未処理・失敗の回覧板を文字起こしする (${pendingCount} 件)`}
      </button>
      {runMessage && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
          {runMessage}
        </p>
      )}

      <section className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">回覧板はまだありません。</p>
        ) : (
          items.map((item) => {
            const s = STATUS_LABEL[item.status ?? "none"];
            const open = openId === item.id;
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1 flex-wrap">
                    <span>{formatDate(item.createdAt)}</span>
                    <span>写真 {item.imageCount} 枚</span>
                    <span className={`rounded px-1.5 ${s.className}`}>{s.label}</span>
                  </div>
                  <p className="text-sm text-gray-800 font-medium break-words">{item.title}</p>
                </button>
                {open && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                    {item.status === "failed" && item.error && (
                      <p className="text-xs text-red-700 whitespace-pre-wrap break-words">失敗の理由: {item.error}</p>
                    )}
                    {item.content ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.content}</p>
                    ) : (
                      <p className="text-xs text-gray-500">まだ文字起こしされていません。</p>
                    )}
                    <div className="flex gap-3 items-center flex-wrap">
                      <Link href={`/circulation/${item.id}`} className="text-xs text-green-700 underline">
                        写真を見る
                      </Link>
                      <button
                        type="button"
                        onClick={() => run(item.id)}
                        disabled={running !== null || item.imageCount === 0}
                        className="text-xs px-3 py-1 rounded-full border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                      >
                        {running === item.id ? "文字起こし中..." : "🔄 文字起こしをやり直す"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-800 tabular-nums">{value}</p>
    </div>
  );
}
