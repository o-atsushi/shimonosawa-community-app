import { getArticles } from "@/lib/api";

export default async function EmergencyPage() {
  const articles = await getArticles("emergency");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">🚨 防災・緊急情報</h1>

      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-4">
        <p className="text-sm font-bold text-yellow-800 mb-1">
          現在、発令中の警報はありません
        </p>
        <p className="text-xs text-yellow-700">
          緊急時はこのページに最新情報が掲載されます。
        </p>
      </div>

      <h2 className="text-base font-bold text-gray-800 mb-3">防災関連情報</h2>
      <div className="space-y-3">
        {articles.map((article) => (
          <article
            key={article.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              {article.important && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-medium">
                  重要
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {article.date}
              </span>
            </div>
            <h3 className="font-bold text-gray-800 text-sm mb-2">
              {article.title}
            </h3>
            <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
              {article.content}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
        <h3 className="font-bold text-red-800 text-sm mb-2">緊急連絡先</h3>
        <ul className="text-sm text-red-700 space-y-1">
          <li>🚒 消防・救急: 119</li>
          <li>🚔 警察: 110</li>
          <li>🏛️ 市役所防災課: 0XX-XXX-XXXX</li>
        </ul>
      </div>
    </div>
  );
}
