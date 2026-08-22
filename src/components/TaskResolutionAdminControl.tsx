"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import { RESOLUTION_OUTCOME_LABELS } from "@/lib/tasks";
import RichEditor from "@/components/RichEditor";
import type { ResolutionOutcome, Task } from "@/types";

const OUTCOME_OPTIONS: ResolutionOutcome[] = [
  "approved",
  "rejected",
  "deferred",
  "undecided",
];

// 議決結果ページに置く役員専用の編集フォーム。
// - 議決結果 (outcome) セレクト
// - 議決日 (date input)
// - まとめ (RichEditor)
// - 保存 / クリアボタン
// 役員以外には表示しない。
export default function TaskResolutionAdminControl({
  task,
}: {
  task: Task;
}) {
  const router = useRouter();
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  const [outcome, setOutcome] = useState<ResolutionOutcome>(
    task.resolutionOutcome
  );
  const [summary, setSummary] = useState<string>(task.resolutionSummary);
  const [date, setDate] = useState<string>(task.resolutionDate ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) return;
      setLineUserId(uid);
      try {
        const res = await fetch(
          `/api/members/me?lineUserId=${encodeURIComponent(uid)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.member?.isAdmin) setIsAdmin(true);
      } catch {
        // ignore
      }
    }).catch(() => {});
  }, []);

  if (!isAdmin || !lineUserId) return null;

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/tasks/${task.id}/resolution`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolutionOutcome: outcome,
            resolutionSummary: summary,
            resolutionDate: date,
            lineUserId,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(
          (d.error ?? "保存に失敗しました") +
            (d.detail ? `\n詳細: ${d.detail}` : "")
        );
        return;
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("議決結果を「未決」に戻し、まとめと日付を空にしますか?")) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/tasks/${task.id}/resolution`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolutionOutcome: "undecided",
            resolutionSummary: "",
            resolutionDate: "",
            lineUserId,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "クリアに失敗しました");
        return;
      }
      setOutcome("undecided");
      setSummary("");
      setDate("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
      <h2 className="text-sm font-bold text-purple-900 mb-3">
        🛡️ 役員専用: 議決結果を編集
      </h2>

      <div className="bg-white rounded-lg p-3 border border-purple-100 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            議決結果
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as ResolutionOutcome)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {RESOLUTION_OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            議決日 (任意)
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            まとめ (経緯・条件・補足など。画像・見出し・リンクも使えます)
          </label>
          <RichEditor
            value={summary}
            onChange={setSummary}
            lineUserId={lineUserId}
            uploadEndpoint="/api/uploads/task-image"
            placeholder="議決に至った経緯、決定した内容、注意事項などをまとめて記載"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleClear}
            disabled={submitting}
            className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
          >
            🗑 内容をクリア
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white"
          >
            {submitting ? "保存中..." : "議決結果を保存"}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-700 whitespace-pre-wrap">{error}</p>
        )}
      </div>

      <p className="text-xs text-purple-700 mt-3">
        💡 「未決」+ まとめ空欄のままだと、住民側の議決結果ページは「まだまとまっていません」表示になります。
      </p>
    </section>
  );
}
