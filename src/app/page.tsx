import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import ArticleCard from "@/components/ArticleCard";
import ArticlesBadge from "@/components/ArticlesBadge";
import InquiryCard from "@/components/InquiryCard";
import { getArticles, getCategories, getLatestArticles } from "@/lib/api";
import { getInquiries } from "@/lib/inquiries";

export const revalidate = 60;

export default async function Home() {
  const categories = getCategories();
  const [latestArticles, allInquiries, newsArticles] = await Promise.all([
    getLatestArticles(5),
    getInquiries(),
    getArticles("news"),
  ]);
  const latestInquiries = allInquiries.slice(0, 3);
  // お知らせカードの未読バッジ用に publishedAt (= date) の配列だけ渡す
  const newsPublishedAtList = newsArticles.map((a) => a.date);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">カテゴリ</h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              badge={
                cat.id === "news" ? (
                  <ArticlesBadge publishedAtList={newsPublishedAtList} />
                ) : undefined
              }
            />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">💬 みんなの掲示板</h2>
          <Link
            href="/inquiries"
            className="text-sm text-green-600 hover:underline"
          >
            もっと見る →
          </Link>
        </div>
        <div className="space-y-3">
          {latestInquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
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
