import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleById } from "@/lib/api";

export default async function EventDetailPage({
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
        href="/events"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← イベント一覧に戻る
      </Link>
      <article className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
            イベント
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
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {article.content}
        </div>
      </article>
    </div>
  );
}
