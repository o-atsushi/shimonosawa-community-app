"use client";

import { useEffect, useRef, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 回覧板への「1 人 1 回」トグルボタン (興味ある)。
// - 件数は SSR 側から initialCount で受け取り、タップで +1 / -1 する楽観的更新
// - 自分がすでに押しているかは各 kind の /me API で非同期取得
// - LIFF 未ログイン / 認証失敗時はボタン自体は見えるが押すとエラー表示
//
// variant:
//   "compact" : サムネカード内に小さく配置する用 (アイコン + 件数のみ。日付の折り返し防止)。
//               カード自体の Link と干渉しないよう stopPropagation + preventDefault を付ける。
//   "full"    : 詳細ページ用の大きめのボタン。

type Kind = "interest";

const KINDS: Record<
  Kind,
  {
    endpoint: string;
    idsKey: string;
    stateKey: string;
    label: string;
    onFull: string;
    onCompact: string;
    offCompactHover: string;
    Icon: (props: { filled: boolean; className?: string }) => React.ReactNode;
  }
> = {
  interest: {
    endpoint: "/api/circulations/interests",
    idsKey: "interestedIds",
    stateKey: "interested",
    label: "興味ある",
    onFull: "bg-pink-50 border-pink-300 text-pink-600",
    onCompact: "text-pink-600",
    offCompactHover: "hover:text-pink-500",
    Icon: HeartIcon,
  },
};

export default function CirculationReactionButton({
  kind,
  circulationId,
  initialCount,
  variant = "compact",
}: {
  kind: Kind;
  circulationId: string;
  initialCount: number;
  variant?: "compact" | "full";
}) {
  const cfg = KINDS[kind];
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
        const res = await fetch(`${cfg.endpoint}/me`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: uid,
            circulationIds: [circulationId],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const ids = data[cfg.idsKey];
          setInterested(Array.isArray(ids) && ids.includes(circulationId));
        } else {
          setInterested(false);
        }
      } catch {
        setInterested(false);
      }
    }).catch(() => setInterested(false));
  }, [circulationId, cfg]);

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
      const res = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circulationId, lineUserId }),
      });
      if (!res.ok) {
        // 失敗したら元に戻す
        setInterested(prevInterested);
        setCount(prevCount);
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `${cfg.label}の操作に失敗しました`);
        return;
      }
      const data = await res.json();
      // サーバの正確な値で上書き
      if (typeof data.count === "number") setCount(data.count);
      const active = data[cfg.stateKey];
      if (typeof active === "boolean") setInterested(active);
    } catch {
      setInterested(prevInterested);
      setCount(prevCount);
      setError("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  const isFull = variant === "full";
  const sizeClass = isFull
    ? "gap-1.5 px-4 py-2 text-sm rounded-full border"
    : "gap-1 px-1.5 py-1 text-xs rounded-full";
  const stateClass = interested
    ? isFull
      ? cfg.onFull
      : cfg.onCompact
    : isFull
      ? "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
      : `text-gray-400 ${cfg.offCompactHover}`;
  const Icon = cfg.Icon;

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy || interested === null}
        className={`inline-flex items-center shrink-0 transition-colors select-none ${sizeClass} ${stateClass} disabled:opacity-60 disabled:cursor-not-allowed`}
        aria-pressed={interested === true}
        aria-label={interested ? `${cfg.label}を取り消す` : cfg.label}
      >
        {/* key を切り替えて ON になった瞬間だけポップアニメを再生する */}
        <Icon
          key={interested ? "on" : "off"}
          filled={interested === true}
          className={`${isFull ? "w-5 h-5" : "w-4 h-4"} ${
            interested ? "animate-heart-pop" : ""
          }`}
        />
        {isFull && <span className="font-bold">{cfg.label}</span>}
        <span className="font-semibold tabular-nums">{count}</span>
      </button>
      {error && isFull && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </>
  );
}

function HeartIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
    </svg>
  );
}

