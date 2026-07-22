"use client";

import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// コメントへの 👍 ボタン。InquiryLikeButton とほぼ同構造。
//
// - initialCount: サーバー集計済みの数
// - initialLiked: 親が一括取得した「自分の 👍 状態」を渡す場合 (省略時は
//   自前で /me を叩く)
// - taskId: 課題 ID。revalidatePath 用に POST body に含める
export default function CommentLikeButton({
  commentId,
  taskId,
  initialCount,
  initialLiked,
}: {
  commentId: string;
  taskId: string;
  initialCount: number;
  initialLiked?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [lineUserId, setLineUserId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then((profile) => {
      if (!profile?.userId) return;
      setLineUserId(profile.userId);
      if (initialLiked == null) {
        fetch("/api/comments/likes/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: profile.userId,
            commentIds: [commentId],
          }),
        })
          .then((res) => (res.ok ? res.json() : { likedIds: [] }))
          .then((data: { likedIds?: string[] }) => {
            if (
              Array.isArray(data.likedIds) &&
              data.likedIds.includes(commentId)
            ) {
              setLiked(true);
            }
          })
          .catch(() => {
            // 無視 (未ログイン扱いでオフ表示のまま)
          });
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId]);

  async function handleClick() {
    if (!lineUserId || submitting) return;
    // 楽観更新
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? Math.max(prevCount - 1, 0) : prevCount + 1);
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, lineUserId, taskId }),
      });
      if (!res.ok) throw new Error("toggle failed");
      const data: { liked: boolean; count: number } = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      // 失敗時はロールバック
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !lineUserId || submitting;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={liked ? "いいねを取り消す" : "いいねする"}
      title={
        !lineUserId
          ? "LINE ログイン後に押せます"
          : liked
            ? "いいねを取り消す"
            : "いいねする"
      }
      className={`inline-flex items-center gap-1 rounded-full border text-xs px-2 py-1 transition-colors ${
        liked
          ? "bg-blue-50 border-blue-300 text-blue-700"
          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
      } ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span aria-hidden="true">👍</span>
      <span className="font-bold tabular-nums">{count}</span>
    </button>
  );
}
