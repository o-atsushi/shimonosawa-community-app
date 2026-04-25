"use client";

import { useEffect, useState } from "react";
import { countUnread } from "@/lib/articles-badge";

// 親から最新記事の publishedAt 一覧を受け取り、クライアント側で未読件数を計算する。
// localStorage を参照するためクライアントコンポーネント必須。
// 未読がない時は何も描画しないため、レイアウトに影響しない。
export default function ArticlesBadge({
  publishedAtList,
}: {
  publishedAtList: string[];
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(countUnread(publishedAtList));
  }, [publishedAtList]);

  if (count <= 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
      {count > 99 ? "99+" : count}
    </span>
  );
}
