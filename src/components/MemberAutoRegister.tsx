"use client";

import { useEffect } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// LIFF ログイン済みの住民を members テーブルに自動登録するための無表示コンポーネント。
// Layout に 1 回マウントすれば、アプリ表示時に 1 回だけ /api/members/me に POST し、
// 未登録なら登録、登録済みなら何もしない。
//
// localStorage に登録完了フラグを置いて、同一ブラウザでの重複 POST を抑止する
// (毎ページロードで叩かないように)。
const FLAG_KEY = "shimonosawa_member_registered";

export default function MemberAutoRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isLoggedIn()) return;
    if (localStorage.getItem(FLAG_KEY) === "1") return;

    const p = getProfile();
    if (!p) return;
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) return;
      const displayName = profile?.displayName ?? "住民";
      try {
        const res = await fetch("/api/members/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: uid, displayName }),
        });
        if (res.ok) {
          localStorage.setItem(FLAG_KEY, "1");
        }
      } catch (err) {
        // 失敗しても致命的ではない (次回再試行されるだけ)
        console.warn("[MemberAutoRegister] failed", err);
      }
    }).catch((err) => {
      console.warn("[MemberAutoRegister] getProfile failed", err);
    });
  }, []);

  return null;
}
