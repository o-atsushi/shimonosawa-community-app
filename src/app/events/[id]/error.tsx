"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function EventDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/events/[id]] error", error);
  }, [error]);

  return (
    <div>
      <Link
        href="/events"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← イベント一覧に戻る
      </Link>
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
        <h2 className="text-lg font-bold text-red-800 mb-2">
          ページの読み込みに失敗しました
        </h2>
        <p className="text-sm text-red-700 mb-4">
          時間をおいて再度お試しください。
        </p>
        <button
          onClick={() => reset()}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
