"use client";

import { useEffect, useState } from "react";
import InquiryPublishToggleButton from "@/components/InquiryPublishToggleButton";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 詳細ページに置く役員専用の公開トグル。
// is_admin を判定してから InquiryPublishToggleButton を出す。
// 非役員には何も表示しない。
export default function InquiryAdminPublishControl({
  inquiryId,
  isPublished,
}: {
  inquiryId: string;
  isPublished: boolean;
}) {
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) return;
      setLineUserId(uid);
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

  if (!isAdmin || !lineUserId) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap mb-3">
      <p className="text-xs text-purple-800">
        🛡️ 役員専用: この投稿の公開状態を切り替えできます
      </p>
      <InquiryPublishToggleButton
        inquiryId={inquiryId}
        lineUserId={lineUserId}
        isPublished={isPublished}
      />
    </div>
  );
}
