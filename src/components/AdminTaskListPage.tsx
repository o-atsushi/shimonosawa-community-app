"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";
import {
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from "@/lib/tasks";
import type { Task } from "@/types";

// 役員専用: 課題の一覧 (作成/編集導線)
// 認可はクライアント側で /api/members/me 経由で is_admin を判定する。
// 一覧データは公開 API /api/tasks ... と同じ getTasks 結果を SSR で取得しても良いが、
// 本コンポーネントはあくまでクライアントから取得する (新規作成直後の表示更新のため)。
export default function AdminTaskListPage({
  initialTasks,
}: {
  initialTasks: Task[];
}) {
  const [tasks] = useState<Task[]>(initialTasks);
  const [authState, setAuthState] = useState<
    "loading" | "needs_login" | "forbidden" | "ready"
  >("loading");

  useEffect(() => {
    if (!isLoggedIn()) {
      setAuthState("needs_login");
      return;
    }
    const p = getProfile();
    if (!p) {
      setAuthState("needs_login");
      return;
    }
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) {
        setAuthState("needs_login");
        return;
      }
      try {
        const res = await fetch(
          `/api/members/me?lineUserId=${encodeURIComponent(uid)}`
        );
        if (!res.ok) {
          setAuthState("needs_login");
          return;
        }
        const data = await res.json();
        setAuthState(data.member?.isAdmin ? "ready" : "forbidden");
      } catch {
        setAuthState("needs_login");
      }
    }).catch(() => setAuthState("needs_login"));
  }, []);

  if (authState === "loading") {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }
  if (authState === "needs_login") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        LINE 経由でアプリを開いてください。
      </div>
    );
  }
  if (authState === "forbidden") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        このページは役員のみ閲覧できます。
        <br />
        <Link href="/tasks" className="underline text-red-700">
          ← 課題一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/tasks"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 課題一覧に戻る
      </Link>

      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-gray-800">🛡️ 課題の管理 (役員専用)</h1>
        <Link
          href="/admin/tasks/new"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white"
        >
          ＋ 新規作成
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ課題はありません。「＋ 新規作成」から追加してください。
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <article
              key={t.id}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[t.status]}`}
                >
                  {TASK_STATUS_LABELS[t.status]}
                </span>
                {t.priority && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_PRIORITY_COLORS[t.priority]}`}
                  >
                    {TASK_PRIORITY_LABELS[t.priority]}
                  </span>
                )}
                {t.displayOrder !== undefined && (
                  <span className="text-xs text-gray-400 font-mono">
                    #{t.displayOrder}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {t.publishedAt.split("T")[0]}
                </span>
              </div>
              <h3 className="font-bold text-sm text-gray-800 leading-snug mb-2">
                {t.title}
              </h3>
              <div className="flex items-center gap-2 justify-end">
                <Link
                  href={`/tasks/${t.id}`}
                  className="text-xs text-gray-600 hover:underline"
                >
                  表示
                </Link>
                <Link
                  href={`/admin/tasks/${t.id}/edit`}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  編集
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
