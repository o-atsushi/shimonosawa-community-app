"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";
import type { CirculationViewStats } from "@/types";

interface Data {
  circulation: { id: string; title: string; createdAt: string };
  stats: CirculationViewStats;
}

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

// 役員専用: 回覧板 1 件の閲覧統計を表示する。
// クライアント側で LIFF userId を取得 → /api/admin/circulation-views POST で
// 役員チェック + データ取得 → 表示。
export default function CirculationViewsAdminPage({
  circulationId,
}: {
  circulationId: string;
}) {
  const [data, setData] = useState<Data | null>(null);
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
        const res = await fetch("/api/admin/circulation-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ circulationId, lineUserId: uid }),
        });
        if (res.status === 403) {
          setStatus("forbidden");
          return;
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErrorMsg(d.error ?? "閲覧履歴の取得に失敗しました");
          setStatus("error");
          return;
        }
        const json: Data = await res.json();
        setData(json);
        setStatus("ready");
      } catch (err) {
        console.error("[CirculationViewsAdminPage] fetch failed", err);
        setErrorMsg("通信エラーが発生しました");
        setStatus("error");
      }
    }).catch(() => setStatus("needs_login"));
  }, [circulationId]);

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
        <Link
          href={`/circulation/${circulationId}`}
          className="underline text-red-700"
        >
          ← 回覧板に戻る
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

  const { circulation, stats } = data;

  return (
    <div>
      <Link
        href={`/circulation/${circulationId}`}
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 回覧板に戻る
      </Link>

      <h1 className="text-lg font-bold text-gray-800 mb-2">
        🛡️ 閲覧履歴 (役員専用)
      </h1>
      <p className="text-sm text-gray-700 mb-4">
        回覧板: <span className="font-bold">{circulation.title}</span>
      </p>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-1">ユニーク閲覧者</p>
          <p className="text-2xl font-bold text-green-700">
            {stats.uniqueViewers}
            <span className="text-sm font-normal text-gray-500 ml-1">人</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-1">延べ閲覧 (PV)</p>
          <p className="text-2xl font-bold text-blue-700">
            {stats.totalViews}
            <span className="text-sm font-normal text-gray-500 ml-1">回</span>
          </p>
        </div>
      </div>

      {/* 閲覧者一覧 */}
      <h2 className="text-sm font-bold text-gray-700 mb-2">閲覧者一覧</h2>
      {stats.viewers.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ閲覧記録はありません。
        </div>
      ) : (
        <div className="space-y-2">
          {stats.viewers.map((v) => (
            <article
              key={v.lineUserId}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <p className="font-bold text-sm text-gray-800">
                  {v.displayName}
                  {v.displayName === "(未登録)" && (
                    <span className="text-xs text-gray-400 font-normal ml-2 font-mono">
                      {v.lineUserId.slice(0, 8)}...
                    </span>
                  )}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                  {v.viewCount} PV
                </span>
              </div>
              <p className="text-xs text-gray-500">
                初回: {formatDateTime(v.firstViewedAt)}
                {v.viewCount > 1 && (
                  <>
                    {" "}/ 最新: {formatDateTime(v.lastViewedAt)}
                  </>
                )}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        ※ LIFF (LINE) ログイン済みの住民の閲覧のみ記録されます。
        会員未登録 (まだ自動登録が完了していない人) は「(未登録)」と表示されます。
      </p>
    </div>
  );
}
