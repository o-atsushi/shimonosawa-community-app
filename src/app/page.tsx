import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import ArticleCard from "@/components/ArticleCard";
import ArticlesBadge from "@/components/ArticlesBadge";
import InquiryCard from "@/components/InquiryCard";
import TaskCard from "@/components/TaskCard";
import { getArticles, getCategories, getLatestArticles } from "@/lib/api";
import { getInquiries } from "@/lib/inquiries";
import { getTasks } from "@/lib/tasks";

export const revalidate = 60;

export default async function Home() {
  const categories = getCategories();
  const [latestArticles, allInquiries, newsArticles, allTasks] =
    await Promise.all([
      getLatestArticles(5),
      getInquiries(),
      getArticles("news"),
      getTasks(),
    ]);
  const latestInquiries = allInquiries.slice(0, 3);
  // 「課題」はホーム上部のヒーローで強調表示するため、カテゴリカードからは除外する
  const otherCategories = categories.filter((c) => c.id !== "tasks");
  const featuredTasks = allTasks.slice(0, 3);
  const newsPublishedAtList = newsArticles.map((a) => a.date);

  return (
    <div className="space-y-6">
      {/* 課題: 目下一番必要な機能なので最上部にヒーロー表示 */}
      <section className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-800">
            📋 新自治会設立の課題
          </h2>
          <Link
            href="/tasks"
            className="text-sm text-green-700 font-bold hover:underline"
          >
            すべて見る →
          </Link>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          現在検討中の課題に投票・コメントで参加いただけます。
        </p>
        {featuredTasks.length === 0 ? (
          <div className="bg-white/70 rounded-xl p-4 text-center text-sm text-gray-500 border border-green-100">
            まだ課題は登録されていません。
          </div>
        ) : (
          <div className="space-y-3">
            {featuredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">カテゴリ</h2>
        <div className="grid grid-cols-2 gap-3">
          {otherCategories.map((cat) => (
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
