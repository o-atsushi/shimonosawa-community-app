"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import type { RsvpResponse, RsvpSummary } from "@/types";

const NOTE_MAX = 500;

const RSVP_OPTIONS: {
  value: RsvpResponse;
  label: string;
  color: string;
}[] = [
  { value: "attending", label: "参加します", color: "bg-emerald-100 text-emerald-800" },
  { value: "skipping", label: "不参加 (別日に実施予定)", color: "bg-amber-100 text-amber-800" },
  { value: "alt_done", label: "別日に実施済み", color: "bg-sky-100 text-sky-800" },
];

const LABELS: Record<RsvpResponse, string> = {
  attending: "参加",
  skipping: "不参加 (別日予定)",
  alt_done: "別日実施済み",
};

const BAR_COLORS: Record<RsvpResponse, string> = {
  attending: "bg-emerald-500",
  skipping: "bg-amber-500",
  alt_done: "bg-sky-500",
};

// 清掃活動などの参加表明パネル。
// - サーバーから集計を受け取り表示
// - クライアント側で自分の回答を取得 (POST /api/rsvps/me)
// - 「不参加」「別日実施済み」を選んだ場合、別日(任意) と 備考(任意) を入力可能
export default function RsvpPanel({
  articleId,
  summary,
}: {
  articleId: string;
  summary: RsvpSummary;
}) {
  const router = useRouter();
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);

  // 自分の回答 (サーバー側に保存済みのもの)
  const [myResponse, setMyResponse] = useState<RsvpResponse | null>(null);
  const [myAltDate, setMyAltDate] = useState<string>("");
  const [myNote, setMyNote] = useState<string>("");

  // フォームの編集状態
  const [selected, setSelected] = useState<RsvpResponse | null>(null);
  const [altDate, setAltDate] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wantsAltFields = selected === "skipping" || selected === "alt_done";

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
          const res = await fetch("/api/rsvps/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleId, lineUserId: uid }),
          });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && data?.response) {
              setMyResponse(data.response);
              setSelected(data.response);
              const ad: string =
                typeof data.altDate === "string" ? data.altDate : "";
              setMyAltDate(ad);
              setAltDate(ad);
              const n: string = typeof data.note === "string" ? data.note : "";
              setMyNote(n);
              setNote(n);
            }
          }
        } catch (err) {
          console.warn("[RsvpPanel] failed to fetch own rsvp", err);
        }
      })
      .catch((err) => {
        console.warn("[RsvpPanel] failed to get LIFF profile", err);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  async function handleSubmit() {
    if (!selected || !lineUserId) return;
    if (note.length > NOTE_MAX) {
      setError(`備考は${NOTE_MAX}文字以内で入力してください`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/rsvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          lineUserId,
          response: selected,
          altDate: wantsAltFields && altDate ? altDate : null,
          note: wantsAltFields && note.trim() ? note.trim() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "回答に失敗しました");
        return;
      }
      setMyResponse(selected);
      setMyAltDate(wantsAltFields ? altDate : "");
      setMyNote(wantsAltFields ? note : "");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const noChange = useMemo(() => {
    if (selected !== myResponse) return false;
    if (wantsAltFields) {
      return altDate === myAltDate && note === myNote;
    }
    return true;
  }, [selected, myResponse, wantsAltFields, altDate, myAltDate, note, myNote]);

  const total = summary.total;
  const canSubmit = !!selected && !!lineUserId && !submitting && !noChange;

  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="text-base font-bold text-gray-800 mb-3">
        🙋 参加状況
      </h2>

      {authChecked && !lineUserId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-3">
          回答するには LINE 経由でアプリを開く必要があります。
        </div>
      )}

      <div className="space-y-2 mb-4">
        {RSVP_OPTIONS.map((opt) => {
          const checked = selected === opt.value;
          const isMine = myResponse === opt.value;
          const disabled = !lineUserId || submitting;
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                checked
                  ? "bg-green-50 border-green-500"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name={`rsvp-${articleId}`}
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={() => setSelected(opt.value)}
                className="accent-green-600"
              />
              <span className="flex-1 text-sm text-gray-800">{opt.label}</span>
              {isMine && (
                <span className="text-xs text-green-700 font-bold">
                  ✓ あなたの回答
                </span>
              )}
            </label>
          );
        })}
      </div>

      {wantsAltFields && lineUserId && (
        <div className="space-y-3 mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div>
            <label
              htmlFor={`altDate-${articleId}`}
              className="block text-xs text-gray-700 mb-1"
            >
              実施日 (任意)
            </label>
            <input
              id={`altDate-${articleId}`}
              type="date"
              value={altDate}
              onChange={(e) => setAltDate(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label
              htmlFor={`note-${articleId}`}
              className="block text-xs text-gray-700 mb-1"
            >
              備考 (任意)
              <span className="text-gray-400 ml-2">
                {note.length} / {NOTE_MAX}
              </span>
            </label>
            <textarea
              id={`note-${articleId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={NOTE_MAX}
              rows={2}
              disabled={submitting}
              placeholder="実施場所・人数などあれば"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm mb-2"
      >
        {submitting
          ? "送信中..."
          : myResponse
            ? noChange
              ? "回答済み"
              : "回答を更新する"
            : "回答する"}
      </button>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">
          現時点の集計 ({total}人が回答)
        </p>
        <div className="space-y-2">
          {(["attending", "skipping", "alt_done"] as RsvpResponse[]).map((r) => {
            const count = summary.counts[r];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={r}>
                <div className="flex justify-between text-xs text-gray-700 mb-0.5">
                  <span>{LABELS[r]}</span>
                  <span>
                    {count}名 ({pct}%)
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${BAR_COLORS[r]} h-full rounded-full transition-all`}
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
