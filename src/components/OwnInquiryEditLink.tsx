"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 詳細ページで「編集する」リンクを投稿者本人 + 未公開時のみ表示する。
// (公開済みは編集不可、他人は編集不可)
export default function OwnInquiryEditLink({
  inquiryId,
  ownerLineUserId,
  isPublished,
}: {
  inquiryId: string;
  ownerLineUserId?: string;
  isPublished: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isPublished) return; // 公開済みは編集不可
    if (!ownerLineUserId) return; // 所有者が不明なら判定不能
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then((profile) => {
      const uid = profile?.userId;
      if (uid && uid === ownerLineUserId) setShow(true);
    }).catch(() => {});
  }, [inquiryId, ownerLineUserId, isPublished]);

  if (!show) return null;

  return (
    <Link
      href={`/inquiries/${inquiryId}/edit`}
      className="text-xs text-blue-600 hover:underline"
    >
      ✏️ 編集する
    </Link>
  );
}
