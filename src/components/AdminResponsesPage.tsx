"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";
import type { TaskResponseRow, VoteMode } from "@/types";

interface AdminResponseData {
  task: {
    id: string;
    title: string;
    voteMode: VoteMode;
    voteOptions: string[];
    voteDeadline?: string;
  };
  responses: TaskResponseRow[];
}

const MODE_LABEL: Record<VoteMode, string> = {
  single: "単一選択",
  multiple: "複数選択可",
  freetext: "自由回答",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

// 役員向け: 課題 ID を渡すと、各会員の回答を名前付きで一覧表示する。
// LIFF プロフィール取得 → /api/admin/responses POST → 役員でなければ 403、
// 役員なら回答一覧を整形してテーブル状に表示する。
export default function AdminResponsesPage({ taskId }: { taskId: string }) {
  const [data, setData] = useState<AdminResponseData | null>(null);
  const [status, setStatus] = useState<
    "loading" | "needs_login" | "forbidden" | "ready" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setStatus("needs_login");
      return;
    }
    const p = getProfile();
    if (!p) {
      setStatus("needs_login");
      return;
    }
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) {
        setStatus("needs_login");
        return;
      }
      try {
        const res = await fetch("/api/admin/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, lineUserId: uid }),
        });
        if (res.status === 403) {
          setStatus("forbidden");
          return;
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErrorMsg(d.error ?? "回答一覧の取得に失敗しました");
          setStatus("error");
          return;
        }
        const json: AdminResponseData = await res.json();
        setData(json);
        setStatus("ready");
      } catch (err) {
        console.error("[AdminResponsesPage] fetch failed", err);
        setErrorMsg("通信エラーが発生しました");
        setStatus("error");
      }
    }).catch(() => {
      setStatus("needs_login");
    });
  }, [taskId]);

  if (status === "loading") {
    return (
      <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>
    );
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
        <Link href={`/tasks/${taskId}`} className="underline text-red-700">
          ← 課題ページに戻る
        </Link>
      </div>
    );
  }
  if (status === "error" || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        {errorMsg ?? "エラーが発生しました"}
      </div>
    );
  }

  const { task, responses } = data;

  return (
    <div>
      <Link
        href={`/tasks/${taskId}`}
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 課題ページに戻る
      </Link>

      <h1 className="text-lg font-bold text-gray-800 mb-2">
        🛡️ 回答一覧 (役員専用)
      </h1>
      <p className="text-sm text-gray-700 mb-1">
        課題: <span className="font-bold">{task.title}</span>
      </p>
      <p className="text-xs text-gray-500 mb-4">
        回答方式: {MODE_LABEL[task.voteMode]} / 回答者: {responses.length} 人
      </p>

      {responses.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ回答はありません。
        </div>
      ) : (
        <div className="space-y-2">
          {responses.map((r) => (
            <article
              key={r.lineUserId}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="font-bold text-sm text-gray-800">
                  {r.displayName}
                  {r.displayName === "(未登録)" && (
                    <span className="text-xs text-gray-400 font-normal ml-2 font-mono">
                      {r.lineUserId.slice(0, 8)}...
                    </span>
                  )}
                </p>
                <span className="text-xs text-gray-400">
                  {formatDateTime(r.createdAt)}
                </span>
              </div>
              {task.voteMode === "freetext" ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">
                  {r.freeText ?? ""}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {r.selectedOptions.map((opt) => (
                    <span
                      key={opt}
                      className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}
              {r.reason && task.voteMode === "single" && (
                <p className="text-xs text-gray-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2 whitespace-pre-wrap">
                  理由: {r.reason}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
