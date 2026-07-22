import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleById } from "@/lib/api";
import { getRsvpSummary } from "@/lib/rsvps";
import ArticleBody from "@/components/ArticleBody";
import PdfViewer from "@/components/PdfViewer";
import RsvpPanel from "@/components/RsvpPanel";

// 清掃活動の参加状況など即時反映したいので短めの revalidate
export const revalidate = 30;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) return notFound();

  // RSVP が有効な記事 (清掃活動など) のみ集計を取得
  const rsvpSummary = article.rsvpEnabled
    ? await getRsvpSummary(id)
    : null;

  return (
    <div>
      <Link
        href="/news"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← お知らせ一覧に戻る
      </Link>
      <article className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
        {article.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-auto"
            loading="lazy"
          />
        )}
        <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
            イベント
          </span>
          {article.rsvpEnabled && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              🧹 参加表明あり
            </span>
          )}
          {article.important && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-medium">
              重要
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{article.date}</span>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-4">
          {article.title}
        </h1>
        <ArticleBody html={article.body} />
        {article.pdf && <PdfViewer pdf={article.pdf} />}
        </div>
      </article>

      {article.rsvpEnabled && rsvpSummary && (
        <RsvpPanel articleId={article.id} summary={rsvpSummary} />
      )}
    </div>
  );
}
