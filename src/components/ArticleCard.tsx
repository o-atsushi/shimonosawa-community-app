import Link from "next/link";
import type { FormattedArticle } from "@/types";

const categoryLabels: Record<string, string> = {
  news: "お知らせ",
  events: "イベント",
  life: "生活情報",
};

const categoryColors: Record<string, string> = {
  news: "bg-blue-100 text-blue-700",
  events: "bg-orange-100 text-orange-700",
  life: "bg-green-100 text-green-700",
};

export default function ArticleCard({ article }: { article: FormattedArticle }) {
  const href =
    article.category === "life"
      ? `/${article.category}`
      : `/${article.category}/${article.id}`;

  return (
    <Link
      href={href}
      className="block rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[article.category]}`}
        >
          {categoryLabels[article.category]}
        </span>
        {article.important && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-medium">
            重要
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">{article.date}</span>
      </div>
      <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1">
        {article.title}
      </h3>
      <p className="text-xs text-gray-500 line-clamp-2">{article.summary}</p>
      {article.pdf && (
        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
          <span>📄</span>
          <span>PDF添付あり</span>
        </p>
      )}
    </Link>
  );
}
