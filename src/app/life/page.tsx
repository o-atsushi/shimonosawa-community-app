import { getArticles } from "@/lib/api";
import ArticleBody from "@/components/ArticleBody";

export default async function LifePage() {
  const articles = await getArticles("life");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">🏠 生活情報</h1>

      <div className="space-y-3">
        {articles.map((article) => (
          <article
            key={article.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400 ml-auto">
                {article.date}
              </span>
            </div>
            <h3 className="font-bold text-gray-800 text-sm mb-2">
              {article.title}
            </h3>
            <p className="text-xs text-gray-500 mb-3">{article.summary}</p>
            <ArticleBody html={article.content} />
          </article>
        ))}
      </div>

    </div>
  );
}
