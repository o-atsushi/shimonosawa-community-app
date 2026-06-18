"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/liff";

// /inquiries 上部に「自分の投稿」リンクを LIFF ログイン済みの住民にだけ表示する。
// 役員かどうかは問わない (全住民が使える機能)。
export default function MyInquiriesLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <Link
      href="/inquiries/my"
      className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-full px-3 py-1 transition-colors mb-3"
    >
      📝 自分の投稿を見る
    </Link>
  );
}
