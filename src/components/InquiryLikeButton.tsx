"use client";

import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 要望/質問の「いいね」ボタン。
//
// - initialCount: サーバーで集計済みの数 (Server Component から渡す)
// - initialLiked: 親が一括取得した「自分のいいね状態」を初期値として渡す場合に使用 (省略可)
//                  省略時は本コンポーネントが LIFF userId 取得後に自前で /me を呼ぶ
//
// クリックすると /api/inquiries/likes に toggle リクエストを送り、
// レスポンスの最新カウントと自分の状態でローカル state を更新する。
//
// 1人1いいねを担保するのは Supabase 側 (PK)。
// 未ログイン (LIFF外 / userId 取得失敗) では押下不可。
export default function InquiryLikeButton({
  inquiryId,
  initialCount,
  initialLiked,
  // カード内のリンク (Link) の中に置く場合、クリックでナビゲートしないよう
  // stopPropagation する必要があるので true を渡す
  insideLink = false,
  size = "sm",
}: {
  inquiryId: string;
  initialCount: number;
  initialLiked?: boolean;
  insideLink?: boolean;
  size?: "sm" | "md";
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
      // 親から initialLiked が渡されていない場合は自前で取得する
      if (initialLiked == null) {
        fetch("/api/inquiries/likes/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: profile.userId,
            inquiryIds: [inquiryId],
          }),
        })
          .then((res) => (res.ok ? res.json() : { likedIds: [] }))
          .then((data: { likedIds?: string[] }) => {
            if (Array.isArray(data.likedIds) && data.likedIds.includes(inquiryId)) {
              setLiked(true);
            }
          })
          .catch(() => {
            // 無視 (黙ってオフ状態で表示)
          });
      }
    }).catch(() => {
      // LIFF プロフィール取得失敗 → 押下不可のまま
    });
    // initialLiked を依存に入れると StrictMode の二重実行で挙動が変わるので入れない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  async function handleClick(e: React.MouseEvent) {
    if (insideLink) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!lineUserId || submitting) return;
    // 楽観更新 (体感速度向上)
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? Math.max(prevCount - 1, 0) : prevCount + 1);
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, lineUserId }),
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
  const sizeClass =
    size === "md"
      ? "text-sm px-3 py-1.5"
      : "text-xs px-2 py-1";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={liked ? "いいねを取り消す" : "いいねする"}
      title={
        !lineUserId
          ? "LINEログイン後に押せます"
          : liked
            ? "いいねを取り消す"
            : "いいねする"
      }
      className={`inline-flex items-center gap-1 rounded-full border transition-colors ${sizeClass} ${
        liked
          ? "bg-pink-50 border-pink-300 text-pink-600"
          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
      } ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span aria-hidden="true">{liked ? "❤️" : "🤍"}</span>
      <span className="font-bold tabular-nums">{count}</span>
    </button>
  );
}
