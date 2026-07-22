import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleById } from "@/lib/api";
import ArticleBody from "@/components/ArticleBody";
import PdfViewer from "@/components/PdfViewer";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) return notFound();

  return (
    <div>
      <Link
        href="/news"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← お知らせ一覧に戻る
      </Link>
      <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            お知らせ
          </span>
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
    </div>
  );
}
