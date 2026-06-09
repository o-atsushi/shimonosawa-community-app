"use client";

import { useEffect } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 回覧板の詳細ページ表示時に閲覧履歴を 1 行記録する無表示コンポーネント。
// LIFF ログイン済みでないユーザーの閲覧は記録しない (匿名閲覧はカウント外)。
//
// PV カウント方針: マウントするたびに記録する (1 セッションでも複数回 INSERT され得る)。
// ただし React StrictMode の二重マウントで連続発火しないように、初回のみ送るガードを置く。
export default function RecordCirculationView({
  circulationId,
}: {
  circulationId: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isLoggedIn()) return;
    let cancelled = false;
    const p = getProfile();
    if (!p) return;
    p.then(async (profile) => {
      if (cancelled) return;
      const uid = profile?.userId;
      if (!uid) return;
      try {
        await fetch(`/api/circulations/${circulationId}/views`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: uid }),
        });
      } catch {
        // 失敗しても致命的ではない
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [circulationId]);

  return null;
}
