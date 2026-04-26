import ArticleCard from "@/components/ArticleCard";
import { getArticles } from "@/lib/api";

export default async function EventsPage() {
  const articles = await getArticles("events");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">🎉 イベント・行事</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-4">
        ℹ️ キャッチできていない情報があるかもしれません。不足がある場合はご連絡ください。
      </div>
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
