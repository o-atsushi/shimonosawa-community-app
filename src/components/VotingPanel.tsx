"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import { isVoteClosed, requiresReason } from "@/lib/tasks";
import type { VoteMode, VoteSummary } from "@/types";

const REASON_MAX = 200;
const FREETEXT_MAX = 1000;

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

// 残り時間の人間向け文字列。期限切れなら「受付終了」。
function timeLeftText(deadline: string, now: Date = new Date()): string {
  const d = new Date(deadline).getTime();
  const diff = d - now.getTime();
  if (diff <= 0) return "受付終了";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `残り ${minutes} 分`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `残り ${hours} 時間`;
  const days = Math.floor(hours / 24);
  return `残り ${days} 日`;
}

const MODE_LABELS: Record<VoteMode, string> = {
  single: "🗳 投票または回答 (単一選択)",
  multiple: "🗳 投票または回答 (複数選択可)",
  freetext: "📝 自由回答",
};

// 投票パネル。
// - voteMode によって UI を切り替え:
//   - single: ラジオボタン (1 つ選択 + 反対時は理由必須)
//   - multiple: チェックボックス (複数選択可、理由は無し運用)
//   - freetext: テキストエリア (個人回答。他の住民からは見えない)
// - 期限切れなら投票 UI を無効化、結果と「投票終了」を表示
export default function VotingPanel({
  taskId,
  voteMode,
  voteOptions,
  voteDeadline,
  summary,
}: {
  taskId: string;
  voteMode: VoteMode;
  voteOptions: string[];
  voteDeadline?: string;
  summary: VoteSummary;
}) {
  const router = useRouter();
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);

  // 世帯名 (1 世帯 1 票の集計キー)。localStorage に永続化して次回プリフィル。
  const [household, setHousehold] = useState<string>("");

  // 自分の保存済み回答
  const [myOptions, setMyOptions] = useState<string[]>([]);
  const [myFreeText, setMyFreeText] = useState<string>("");
  const [myReason, setMyReason] = useState<string>("");

  // 編集中の入力
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closed = useMemo(() => isVoteClosed(voteDeadline), [voteDeadline]);
  // single モードでのみ「反対」選択肢に理由必須を強制
  const reasonRequired = useMemo(() => {
    if (voteMode !== "single") return false;
    return selected.some((o) => requiresReason(o));
  }, [voteMode, selected]);

  useEffect(() => {
    let cancelled = false;
    // localStorage から世帯名をプリフィル (前回投票で保存したもの)
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("household_name");
        if (saved) setHousehold(saved);
      } catch {
        // ignore (Safari プライベートブラウズ等)
      }
    }
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
          // /api/votes/me に世帯名も渡す: 家族の誰かが投票していれば
          // (line_user_id が違っても) その世帯の票を「自分の票」として復元
          const savedHousehold =
            typeof window !== "undefined"
              ? window.localStorage.getItem("household_name") ?? ""
              : "";
          const res = await fetch("/api/votes/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId,
              lineUserId: uid,
              household: savedHousehold || undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (cancelled) return;
            const opts: string[] = Array.isArray(data.selectedOptions)
              ? data.selectedOptions
              : [];
            const ft: string =
              typeof data.freeText === "string" ? data.freeText : "";
            const rs: string =
              typeof data.reason === "string" ? data.reason : "";
            setMyOptions(opts);
            setSelected(opts);
            setMyFreeText(ft);
            setFreeText(ft);
            setMyReason(rs);
            setReason(rs);
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

  function toggleOption(opt: string) {
    if (voteMode === "single") {
      setSelected([opt]);
    } else if (voteMode === "multiple") {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
    }
  }

  async function handleSubmit() {
    if (!lineUserId || closed) return;
    // 世帯名は必須 (1 世帯 1 票の集計キー)
    const trimmedHousehold = household.trim();
    if (trimmedHousehold.length === 0) {
      setError("世帯名を入力してください (1 世帯 1 票で集計します)");
      return;
    }
    if (voteMode === "freetext") {
      if (freeText.trim().length === 0) {
        setError("回答を入力してください");
        return;
      }
      if (freeText.length > FREETEXT_MAX) {
        setError(`回答は${FREETEXT_MAX}文字以内で入力してください`);
        return;
      }
    } else {
      if (selected.length === 0) {
        setError("選択肢を選んでください");
        return;
      }
      if (reasonRequired && reason.trim().length === 0) {
        setError("反対の場合は理由を入力してください");
        return;
      }
      if (reason.length > REASON_MAX) {
        setError(`理由は${REASON_MAX}文字以内で入力してください`);
        return;
      }
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
          household: trimmedHousehold,
          selectedOptions: voteMode === "freetext" ? undefined : selected,
          freeText: voteMode === "freetext" ? freeText.trim() : undefined,
          reason:
            voteMode === "single" && reason.trim().length > 0
              ? reason.trim()
              : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
        return;
      }
      // 世帯名を localStorage に保存して次回プリフィルできるようにする
      try {
        window.localStorage.setItem("household_name", trimmedHousehold);
      } catch {
        // ignore
      }
      // ローカル状態を「保存済み」として更新
      if (voteMode === "freetext") {
        setMyFreeText(freeText.trim());
      } else {
        setMyOptions(selected);
        setMyReason(reason);
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  // 自分の回答を完全に取り消す。確認ダイアログを出してから DELETE する。
  async function handleWithdraw() {
    if (!lineUserId || closed || submitting) return;
    if (!window.confirm("あなたの回答を取り消しますか?")) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          lineUserId,
          household: household.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "取り消しに失敗しました");
        return;
      }
      // ローカル状態を「未回答」に戻す
      setMyOptions([]);
      setSelected([]);
      setMyFreeText("");
      setFreeText("");
      setMyReason("");
      setReason("");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const noChange =
    voteMode === "freetext"
      ? freeText.trim() === myFreeText
      : sameSet(selected, myOptions) && reason === myReason;

  const canSubmit =
    !!lineUserId &&
    !submitting &&
    !closed &&
    !noChange &&
    household.trim().length > 0 &&
    (voteMode === "freetext"
      ? freeText.trim().length > 0
      : selected.length > 0 &&
        !(reasonRequired && reason.trim().length === 0));

  const alreadyAnswered =
    voteMode === "freetext" ? myFreeText.length > 0 : myOptions.length > 0;

  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-bold text-gray-800">
          {MODE_LABELS[voteMode]}
        </h2>
        {voteDeadline && (
          <div className="text-xs text-gray-600">
            <span className="mr-2">回答期限: {formatDeadline(voteDeadline)}</span>
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
          回答するには LINE 経由でアプリを開く必要があります。
        </div>
      )}
      {closed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 mb-3">
          回答受付は終了しました。
          {voteMode !== "freetext" && "集計結果のみご覧いただけます。"}
        </div>
      )}

      {/* 世帯名入力 (1 世帯 1 票の集計キー) */}
      {!closed && (
        <div className="mb-4">
          <label
            htmlFor={`household-${taskId}`}
            className="block text-xs font-bold text-gray-700 mb-1"
          >
            世帯名 (必須)
            <span className="text-gray-400 font-normal ml-2">
              ご家族で 1 票としてカウントするための識別名
            </span>
          </label>
          <input
            id={`household-${taskId}`}
            type="text"
            value={household}
            onChange={(e) => setHousehold(e.target.value)}
            maxLength={100}
            disabled={!lineUserId || submitting}
            placeholder="例: 山田家"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 同じ世帯名で再度回答すると、ご家族の前の回答が上書きされます。次回からは自動で入力されます。
          </p>
        </div>
      )}

      {voteMode === "freetext" ? (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            この回答はあなたと役員のみが確認できます (他の住民には公開されません)。
          </p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            maxLength={FREETEXT_MAX}
            rows={5}
            disabled={!lineUserId || submitting || closed}
            placeholder="ご自由にご記入ください"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y disabled:bg-gray-50"
          />
          <div className="text-right text-xs text-gray-400 mt-0.5">
            {freeText.length} / {FREETEXT_MAX}
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {voteOptions.map((opt) => {
            const checked = selected.includes(opt);
            const isMine = myOptions.includes(opt);
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
                  type={voteMode === "multiple" ? "checkbox" : "radio"}
                  name={`vote-${taskId}`}
                  value={opt}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleOption(opt)}
                  className="accent-green-600"
                />
                <span className="flex-1 text-sm text-gray-800">{opt}</span>
                {isMine && (
                  <span className="text-xs text-green-700 font-bold">
                    ✓ あなたの回答
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* single モードのみ理由入力欄。multiple は理由なし運用、freetext は本文自体が回答 */}
      {voteMode === "single" && !closed && lineUserId && (
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
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm mb-2"
        >
          {submitting
            ? "送信中..."
            : alreadyAnswered
              ? noChange
                ? "回答済み"
                : "回答を変更する"
              : voteMode === "freetext"
                ? "送信する"
                : "投票または回答する"}
        </button>
      )}
      {/* 回答済みのときだけ「取り消す」リンク (期限内のみ) */}
      {!closed && alreadyAnswered && lineUserId && (
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={submitting}
          className="w-full text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed py-1 mb-2"
        >
          回答を取り消す
        </button>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {/* 集計 (freetext は件数のみ。multiple は選択肢ごとの票数 + 投票者数) */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        {voteMode === "freetext" ? (
          <p className="text-xs text-gray-500">
            これまでに <span className="font-bold">{summary.total}</span> 件の回答が寄せられています。
            <br />
            個別の本文は役員のみが確認します。
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2">
              現時点の集計 ({summary.total}人が回答
              {voteMode === "multiple" && "・複数選択可"})
            </p>
            <div className="space-y-2">
              {voteOptions.map((opt) => {
                const count = summary.counts[opt] ?? 0;
                // 棒グラフの分母:
                // - single: 総投票者数 (= summary.total)
                // - multiple: 最大票数を 100% とすると分かりやすい
                const denom =
                  voteMode === "multiple"
                    ? Math.max(1, ...Object.values(summary.counts))
                    : summary.total;
                const pct = denom > 0 ? Math.round((count / denom) * 100) : 0;
                const displayPctSingle =
                  summary.total > 0
                    ? Math.round((count / summary.total) * 100)
                    : 0;
                return (
                  <div key={opt}>
                    <div className="flex justify-between text-xs text-gray-700 mb-0.5">
                      <span>{opt}</span>
                      <span>
                        {count}票
                        {voteMode === "single" && ` (${displayPctSingle}%)`}
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
          </>
        )}
      </div>
    </section>
  );
}

// 2 つの string[] が同じ集合 (順不同) かどうか
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
}
