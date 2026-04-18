import DOMPurify from "isomorphic-dompurify";

// microCMS のリッチエディタから来る HTML を安全にレンダリングする。
// 記事入稿者は自治会役員で信頼できるが、多層防御として sanitize を通す。
// prose クラスで見出し・リスト・リンク等に自然なタイポグラフィを適用する。
export default function ArticleBody({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
