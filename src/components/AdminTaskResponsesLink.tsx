"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 役員のみに「回答一覧を見る」リンクを出す小さな client component。
// LIFF userId を取って /api/members/me で is_admin を判定し、true ならリンク表示。
// 非役員には何も表示しない。
export default function AdminTaskResponsesLink({ taskId }: { taskId: string }) {
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
        // 失敗時は何も表示しない (役員でないユーザーに見せても害だけ)
      }
    }).catch(() => {
      // ignore
    });
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href={`/tasks/${taskId}/responses`}
      className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-full px-3 py-1 transition-colors"
    >
      🛡️ 役員: 回答一覧を見る
    </Link>
  );
}
