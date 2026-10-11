"use client";

import { useEffect, useRef, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 回覧板の「興味あり」ボタン。
// - 件数は SSR 側から initialCount で受け取り、タップで +1 / -1 する楽観的更新
// - 自分がすでに興味ありしているかは /api/circulations/interests/me で非同期取得
// - LIFF 未ログイン / 認証失敗時はボタン自体は見えるが押すとエラー表示
//
// variant:
//   "compact" : サムネカード内に小さく配置する用。カード自体の Link と干渉しないよう
//               stopPropagation + preventDefault を付ける。
//   "full"    : 詳細ページ用の大きめのボタン。
export default function CirculationInterestButton({
  circulationId,
  initialCount,
  variant = "compact",
}: {
  circulationId: string;
  initialCount: number;
  variant?: "compact" | "full";
}) {
  const [count, setCount] = useState(initialCount);
  const [interested, setInterested] = useState<boolean | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // StrictMode による二重発火防止
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (!isLoggedIn()) {
      setInterested(false);
      return;
    }
    const p = getProfile();
    if (!p) {
      setInterested(false);
      return;
    }
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) {
        setInterested(false);
        return;
      }
      setLineUserId(uid);
      try {
        const res = await fetch("/api/circulations/interests/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: uid,
            circulationIds: [circulationId],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setInterested(
            Array.isArray(data.interestedIds) &&
              data.interestedIds.includes(circulationId)
          );
        } else {
          setInterested(false);
        }
      } catch {
        setInterested(false);
      }
    }).catch(() => setInterested(false));
  }, [circulationId]);

  async function handleToggle(e: React.MouseEvent) {
    // カードカードの Link 内に置かれるので、必ず親伝播を止める
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!lineUserId) {
      setError("LINE 経由でアプリを開いてください");
      return;
    }
    setBusy(true);
    setError(null);
    // 楽観的更新
    const prevInterested = interested;
    const prevCount = count;
    setInterested(!prevInterested);
    setCount((c) => c + (prevInterested ? -1 : 1));
    try {
      const res = await fetch("/api/circulations/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circulationId, lineUserId }),
      });
      if (!res.ok) {
        // 失敗したら元に戻す
        setInterested(prevInterested);
        setCount(prevCount);
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "興味ありの操作に失敗しました");
        return;
      }
      const data = await res.json();
      // サーバの正確な値で上書き
      if (typeof data.count === "number") setCount(data.count);
      if (typeof data.interested === "boolean") setInterested(data.interested);
    } catch {
      setInterested(prevInterested);
      setCount(prevCount);
      setError("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  const base =
    "inline-flex items-center gap-1 rounded-full border transition-colors select-none";
  const sizeClass =
    variant === "full"
      ? "px-4 py-2 text-sm"
      : "px-2.5 py-1 text-xs";
  const stateClass = interested
    ? "bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-100"
    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50";

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy || interested === null}
        className={`${base} ${sizeClass} ${stateClass} disabled:opacity-60 disabled:cursor-not-allowed`}
        aria-pressed={interested === true}
        aria-label={interested ? "興味ありを取り消す" : "興味ありを表明する"}
      >
        <span aria-hidden>{interested ? "❤️" : "🤍"}</span>
        <span className="font-bold">興味あり</span>
        <span className="text-gray-500 font-normal">{count}</span>
      </button>
      {error && variant === "full" && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </>
  );
}
