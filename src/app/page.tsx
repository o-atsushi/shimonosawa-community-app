import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import ArticleCard from "@/components/ArticleCard";
import InquiryCard from "@/components/InquiryCard";
import { getCategories, getLatestArticles } from "@/lib/api";
import { getInquiries } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const categories = getCategories();
  const latestArticles = await getLatestArticles(5);
  const latestInquiries = (await getInquiries()).slice(0, 3);

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
