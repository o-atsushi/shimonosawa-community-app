"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 役員のみに「公開設定ページへ」リンクを出すクライアントコンポーネント。
// /inquiries 一覧の上部に配置。
export default function AdminInquiriesPageLink() {
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
      href="/admin/inquiries"
      className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-full px-3 py-1 transition-colors mb-3"
    >
      🛡️ 役員: 公開設定
    </Link>
  );
}
