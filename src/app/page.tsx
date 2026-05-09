import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import ArticleCard from "@/components/ArticleCard";
import ArticlesBadge from "@/components/ArticlesBadge";
import InquiryCard from "@/components/InquiryCard";
import { getArticles, getCategories, getLatestArticles } from "@/lib/api";
import { getInquiries } from "@/lib/inquiries";
import {
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  getTasks,
} from "@/lib/tasks";
import type { TaskStatus } from "@/types";

export const revalidate = 60;

const STATUS_ORDER: TaskStatus[] = ["open", "in_progress", "resolved"];

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
  const newsPublishedAtList = newsArticles.map((a) => a.date);

  // ステータスごとの件数を集計 (ヒーローの軽量サマリ表示用)
  const taskStatusCounts: Record<TaskStatus, number> = {
    open: 0,
    in_progress: 0,
    resolved: 0,
  };
  for (const t of allTasks) taskStatusCounts[t.status] += 1;

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
        {allTasks.length === 0 ? (
          <div className="bg-white/70 rounded-xl p-4 text-center text-sm text-gray-500 border border-green-100">
            まだ課題は登録されていません。
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {STATUS_ORDER.map((s) => (
              <Link
                key={s}
                href="/tasks"
                className={`flex flex-col items-center justify-center rounded-lg py-2.5 hover:opacity-80 transition-opacity ${TASK_STATUS_COLORS[s]}`}
              >
                <span className="text-xs font-medium">
                  {TASK_STATUS_LABELS[s]}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {taskStatusCounts[s]}
                  <span className="text-xs font-normal ml-0.5">件</span>
                </span>
              </Link>
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
