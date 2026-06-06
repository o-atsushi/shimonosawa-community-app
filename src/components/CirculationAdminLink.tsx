"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 役員のみに「+ 新規アップロード」ボタンを表示する小さな client component。
export default function CirculationAdminLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) return;
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

  if (!isAdmin) return null;

  return (
    <Link
      href="/circulation/new"
      className="fixed bottom-20 right-4 z-40 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg px-5 py-3 flex items-center gap-1 transition-colors"
    >
      <span className="text-xl leading-none">＋</span>
      <span className="text-sm">回覧板を追加</span>
    </Link>
  );
}
