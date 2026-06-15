"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 公開トグルボタン。役員チェックは親側 (AdminInquiryListPage) 等で済んでいる前提で、
// このコンポーネント自体は「現在の公開状態」を受け取り、押下で逆値に切り替える。
// API 失敗時は alert で通知 + 元の状態に戻す。
export default function InquiryPublishToggleButton({
  inquiryId,
  lineUserId,
  isPublished,
  onChanged,
}: {
  inquiryId: string;
  lineUserId: string;
  isPublished: boolean;
  // 親側のローカル状態更新用 (一覧の即時反映に使う)
  onChanged?: (next: boolean) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [localPublished, setLocalPublished] = useState(isPublished);

  async function handleClick() {
    if (submitting) return;
    const next = !localPublished;
    setSubmitting(true);
    // 楽観更新
    setLocalPublished(next);
    onChanged?.(next);
    try {
      const res = await fetch(
        `/api/admin/inquiries/${inquiryId}/publication`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: next, lineUserId }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "更新に失敗しました");
      }
      router.refresh();
    } catch (err) {
      // ロールバック
      setLocalPublished(!next);
      onChanged?.(!next);
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      aria-pressed={localPublished}
      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        localPublished
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {submitting
        ? "更新中..."
        : localPublished
          ? "🌐 公開中 (タップで非公開)"
          : "🔒 非公開 (タップで公開)"}
    </button>
  );
}
