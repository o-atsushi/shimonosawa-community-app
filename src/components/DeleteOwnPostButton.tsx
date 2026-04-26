"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 投稿者本人にだけ表示するソフトデリートボタン。
// - target.lineUserId と LIFF の getProfile().userId が一致する場合のみ描画
// - DELETE リクエストの URL とリクエストボディは呼び出し側で組み立てる
//   (掲示板投稿は /api/inquiries/[id] / コメントは /api/comments/[id])
export default function DeleteOwnPostButton({
  ownerLineUserId,
  endpoint,
  extraBody,
  onDeleted,
  confirmMessage = "本当に削除しますか?",
  label = "削除",
}: {
  ownerLineUserId: string | undefined;
  endpoint: string;
  extraBody?: Record<string, unknown>;
  onDeleted?: () => void;
  confirmMessage?: string;
  label?: string;
}) {
  const router = useRouter();
  const [viewerLineUserId, setViewerLineUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      .then((profile) => {
        if (profile?.userId) setViewerLineUserId(profile.userId);
      })
      .catch((err) => {
        console.warn("[DeleteOwnPostButton] failed to get LIFF profile", err);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // 所有権が確定するまで何も表示しない
  if (!authChecked) return null;
  if (!ownerLineUserId || !viewerLineUserId) return null;
  if (ownerLineUserId !== viewerLineUserId) return null;

  async function handleDelete() {
    if (!confirm(confirmMessage)) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: viewerLineUserId,
          ...(extraBody ?? {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={submitting}
        className="text-xs text-red-600 hover:text-red-700 disabled:text-gray-400 underline underline-offset-2"
      >
        {submitting ? "削除中..." : label}
      </button>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
