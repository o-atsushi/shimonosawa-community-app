import MarkArticlesVisitedOnMount from "@/components/MarkArticlesVisitedOnMount";
import NewsListWithFilter from "@/components/NewsListWithFilter";
import { getArticles } from "@/lib/api";

export const revalidate = 60;

// 旧「お知らせ (news)」と「イベント (events)」を 1 つの一覧にマージし、
// サブカテゴリ (自治会運営 / 土地開発) で絞り込めるようにする。
// 並びは publishedAt (= article.date) 降順。
export default async function NewsPage() {
  const [news, events] = await Promise.all([
    getArticles("news"),
    getArticles("events"),
  ]);
  const articles = [...news, ...events].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

  return (
    <div>
      <MarkArticlesVisitedOnMount />
      <h1 className="text-xl font-bold text-gray-800 mb-2">📢 お知らせ</h1>
      <p className="text-xs text-gray-500 mb-4">
        自治会からのお知らせと、お祭り・清掃活動などのイベント案内をまとめて表示しています。
        タブで「自治会運営」「土地開発」に絞り込めます。
      </p>
      {articles.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ投稿はありません。
        </div>
      ) : (
        <NewsListWithFilter articles={articles} />
      )}
    </div>
  );
}
