import CategoryCard from "@/components/CategoryCard";
import ArticleCard from "@/components/ArticleCard";
import { getCategories, getLatestArticles } from "@/lib/api";

export default async function Home() {
  const categories = getCategories();
  const latestArticles = await getLatestArticles(5);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">カテゴリ</h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">最新情報</h2>
        <div className="space-y-3">
          {latestArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
