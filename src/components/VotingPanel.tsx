"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import { isVoteClosed, requiresReason } from "@/lib/tasks";
import type { VoteSummary } from "@/types";

const REASON_MAX = 200;

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

// 残り時間の人間向け文字列。期限切れなら「投票終了」。
function timeLeftText(deadline: string, now: Date = new Date()): string {
  const d = new Date(deadline).getTime();
  const diff = d - now.getTime();
  if (diff <= 0) return "投票終了";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `残り ${minutes} 分`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `残り ${hours} 時間`;
  const days = Math.floor(hours / 24);
  return `残り ${days} 日`;
}

// 投票パネル。
// - 期限切れなら投票UI を無効化、結果と「投票終了」を表示
// - 「反対」を含む選択肢を選んだ時は理由入力を必須化 (200文字以内)
export default function VotingPanel({
  taskId,
  voteOptions,
  voteDeadline,
  summary,
}: {
  taskId: string;
  voteOptions: string[];
  voteDeadline?: string;
  summary: VoteSummary;
}) {
  const router = useRouter();
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [myReason, setMyReason] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closed = useMemo(() => isVoteClosed(voteDeadline), [voteDeadline]);
  const reasonRequired = useMemo(
    () => (selected ? requiresReason(selected) : false),
    [selected]
  );

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
              const r: string = typeof data.reason === "string" ? data.reason : "";
              setMyReason(r);
              setReason(r);
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
    if (!selected || !lineUserId || closed) return;
    if (reasonRequired && reason.trim().length === 0) {
      setError("反対の場合は理由を入力してください");
      return;
    }
    if (reason.length > REASON_MAX) {
      setError(`理由は${REASON_MAX}文字以内で入力してください`);
      return;
    }
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
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "投票に失敗しました");
        return;
      }
      setMyVote(selected);
      setMyReason(reason);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const total = summary.total;
  const noChange = selected === myVote && reason === myReason;
  const canSubmit =
    !!selected &&
    !!lineUserId &&
    !submitting &&
    !closed &&
    !noChange &&
    !(reasonRequired && reason.trim().length === 0);

  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-bold text-gray-800">🗳 投票</h2>
        {voteDeadline && (
          <div className="text-xs text-gray-600">
            <span className="mr-2">投票期限: {formatDeadline(voteDeadline)}</span>
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${
                closed
                  ? "bg-gray-200 text-gray-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {timeLeftText(voteDeadline)}
            </span>
          </div>
        )}
      </div>

      {authChecked && !lineUserId && !closed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-3">
          投票するには LINE 経由でアプリを開く必要があります。
        </div>
      )}
      {closed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 mb-3">
          投票は終了しました。集計結果のみご覧いただけます。
        </div>
      )}

      <div className="space-y-2 mb-4">
        {voteOptions.map((opt) => {
          const checked = selected === opt;
          const isMyVote = myVote === opt;
          const disabled = !lineUserId || submitting || closed;
          return (
            <label
              key={opt}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                checked
                  ? "bg-green-50 border-green-500"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name={`vote-${taskId}`}
                value={opt}
                checked={checked}
                disabled={disabled}
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

      {!closed && lineUserId && (
        <div className="mb-3">
          <label
            htmlFor={`reason-${taskId}`}
            className="block text-xs text-gray-700 mb-1"
          >
            {reasonRequired ? "理由 (必須)" : "理由 (任意)"}
            <span className="text-gray-400 ml-2">
              {reason.length} / {REASON_MAX}
            </span>
          </label>
          <textarea
            id={`reason-${taskId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX}
            rows={2}
            placeholder={
              reasonRequired
                ? "反対の理由をご記入ください"
                : "ご意見があればぜひお書きください"
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
      )}

      {!closed && (
        <button
          type="button"
          onClick={handleVote}
          disabled={!canSubmit}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm mb-2"
        >
          {submitting
            ? "送信中..."
            : myVote
              ? noChange
                ? "投票済み"
                : "投票を変更する"
              : "投票する"}
        </button>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

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
