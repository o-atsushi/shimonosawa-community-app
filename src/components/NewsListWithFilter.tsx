"use client";

import { useMemo, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import type { ArticleSubCategory, FormattedArticle } from "@/types";

type TabKey = "all" | ArticleSubCategory;

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "all", label: "すべて", icon: "🗂" },
  { key: "association", label: "自治会運営", icon: "🏘" },
  { key: "land_development", label: "土地開発", icon: "🌱" },
];

// お知らせ一覧の絞り込み UI (クライアント側フィルタ)。
// 記事は SSR で全件取得済みなので、切替はページ遷移なしで即時反映される。
export default function NewsListWithFilter({
  articles,
}: {
  articles: FormattedArticle[];
}) {
  const [tab, setTab] = useState<TabKey>("all");

  // 各タブの件数 (バッジ用)
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: articles.length,
      association: 0,
      land_development: 0,
    };
    for (const a of articles) {
      c[a.subCategory] += 1;
    }
    return c;
  }, [articles]);

  const filtered = useMemo(() => {
    if (tab === "all") return articles;
    return articles.filter((a) => a.subCategory === tab);
  }, [articles, tab]);

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`text-xs font-bold px-3 py-2 whitespace-nowrap rounded-t-lg transition-colors ${
              tab === t.key
                ? "bg-blue-100 text-blue-800 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span aria-hidden="true" className="mr-1">
              {t.icon}
            </span>
            {t.label}
            <span className="text-gray-400 font-normal ml-1">
              ({counts[t.key]})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          この分類の投稿はまだありません。
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
