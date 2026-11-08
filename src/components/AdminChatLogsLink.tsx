"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 役員のみに「質問ログ」リンクを出す。/chat の上部に配置。
export default function AdminChatLogsLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) return;
      try {
        const res = await fetch(`/api/members/me?lineUserId=${encodeURIComponent(uid)}`);
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
      href="/admin/chat-logs"
      className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-full px-3 py-1 transition-colors"
    >
      🛡️ 役員: 質問ログ
    </Link>
  );
}
