import ArticleCard from "@/components/ArticleCard";
import MarkArticlesVisitedOnMount from "@/components/MarkArticlesVisitedOnMount";
import { getArticles } from "@/lib/api";

export const revalidate = 60;

export default async function NewsPage() {
  const articles = await getArticles("news");

  return (
    <div>
      <MarkArticlesVisitedOnMount />
      <h1 className="text-xl font-bold text-gray-800 mb-4">📢 お知らせ</h1>
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
