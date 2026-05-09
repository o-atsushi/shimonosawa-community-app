"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import type { VoteSummary } from "@/types";

// 投票パネル。サーバーから渡された集計 (summary) を初期表示し、
// クライアント側で「自分の投票」を別途 fetch する。投票後は router.refresh() で
// サーバー側の集計を再取得して反映。
//
// props:
// - taskId: 課題 id (microCMS の content id)
// - voteOptions: 役員が microCMS で設定した選択肢
// - summary: getVoteSummary() の結果 (Server Component で取得)
export default function VotingPanel({
  taskId,
  voteOptions,
  summary,
}: {
  taskId: string;
  voteOptions: string[];
  summary: VoteSummary;
}) {
  const router = useRouter();
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // LIFF userId 取得 + 自分の投票を取得
  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn()) {
      setAuthChecked(true);
      return;
    }
    const profilePromise = getProfile();
    if (!profilePromise) {
      setAuthChecked(true);
      return;
    }
    profilePromise
      .then(async (profile) => {
        if (cancelled) return;
        const uid = profile?.userId;
        if (!uid) return;
        setLineUserId(uid);
        // 自分の投票を取得
        try {
          const res = await fetch("/api/votes/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, lineUserId: uid }),
          });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && data?.selectedOption) {
              setMyVote(data.selectedOption);
              setSelected(data.selectedOption);
            }
          }
        } catch (err) {
          console.warn("[VotingPanel] failed to fetch own vote", err);
        }
      })
      .catch((err) => {
        console.warn("[VotingPanel] failed to get LIFF profile", err);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function handleVote() {
    if (!selected || !lineUserId) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          lineUserId,
          selectedOption: selected,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "投票に失敗しました");
        return;
      }
      setMyVote(selected);
      router.refresh(); // 集計バーを更新
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const total = summary.total;
  const canSubmit =
    !!selected && !!lineUserId && !submitting && selected !== myVote;

  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="text-base font-bold text-gray-800 mb-3">🗳 投票</h2>

      {/* ログインチェック */}
      {authChecked && !lineUserId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-3">
          投票するには LINE 経由でアプリを開く必要があります。
        </div>
      )}

      {/* 選択肢 */}
      <div className="space-y-2 mb-4">
        {voteOptions.map((opt) => {
          const checked = selected === opt;
          const isMyVote = myVote === opt;
          return (
            <label
              key={opt}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                checked
                  ? "bg-green-50 border-green-500"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              } ${!lineUserId ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name={`vote-${taskId}`}
                value={opt}
                checked={checked}
                disabled={!lineUserId || submitting}
                onChange={() => setSelected(opt)}
                className="accent-green-600"
              />
              <span className="flex-1 text-sm text-gray-800">{opt}</span>
              {isMyVote && (
                <span className="text-xs text-green-700 font-bold">
                  ✓ あなたの投票
                </span>
              )}
            </label>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleVote}
        disabled={!canSubmit}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm mb-2"
      >
        {submitting
          ? "送信中..."
          : myVote
            ? selected === myVote
              ? "投票済み"
              : "投票を変更する"
            : "投票する"}
      </button>
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* 集計バー */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">
          現時点の集計 ({total}人が投票)
        </p>
        <div className="space-y-2">
          {voteOptions.map((opt) => {
            const count = summary.counts[opt] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={opt}>
                <div className="flex justify-between text-xs text-gray-700 mb-0.5">
                  <span>{opt}</span>
                  <span>
                    {count}票 ({pct}%)
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
