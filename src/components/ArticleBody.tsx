import sanitizeHtml from "sanitize-html";

// microCMS のリッチエディタから来る HTML を安全にレンダリングする。
// 記事入稿者は自治会役員で信頼できるが、多層防御として sanitize を通す。
// prose クラスで見出し・リスト・リンク等に自然なタイポグラフィを適用する。
//
// sanitize-html (Pure JS) を採用。以前 isomorphic-dompurify を使っていたが
// jsdom 依存が Next.js 16 / Turbopack の CommonJS バンドルと ESM 互換性で
// 衝突して 500 エラーになっていたため移行した。

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // microCMS リッチエディタが使う典型的なタグを許可
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "div",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "ins",
    "blockquote",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["class", "id"],
  },
  // javascript: などの危険なURIスキームを禁止 (デフォルトで http/https/mailto/tel のみ許可)
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // 外部リンクは自動で rel="noopener noreferrer" を付与
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
      },
    }),
  },
};

export default function ArticleBody({
  html,
}: {
  html: string | null | undefined;
}) {
  if (!html) return null;
  let clean = "";
  try {
    clean = sanitizeHtml(html, SANITIZE_OPTIONS);
  } catch (err) {
    console.error("[ArticleBody] sanitize failed", err);
    return null;
  }
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
