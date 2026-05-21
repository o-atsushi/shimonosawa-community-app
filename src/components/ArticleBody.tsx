import sanitizeHtml from "sanitize-html";
import {
  TRUSTED_BODY_SANITIZE,
  inquiryBodySanitize,
} from "@/lib/sanitize";

// microCMS のリッチエディタから来る HTML を安全にレンダリングする。
// 入稿者の信頼度に応じて 2 つの sanitize プロファイルを切り替える:
// - "trusted" (デフォルト): 役員入稿 (articles / tasks)
// - "untrusted": 住民投稿 (inquiries) — タグ/属性/画像 src を厳しめに絞る
//
// sanitize-html (Pure JS) を採用。以前 isomorphic-dompurify を使っていたが
// jsdom 依存が Next.js 16 / Turbopack の CommonJS バンドルと ESM 互換性で
// 衝突して 500 エラーになっていたため移行した。

export default function ArticleBody({
  html,
  variant = "trusted",
}: {
  html: string | null | undefined;
  variant?: "trusted" | "untrusted";
}) {
  if (!html) return null;
  let clean = "";
  try {
    const options =
      variant === "untrusted" ? inquiryBodySanitize() : TRUSTED_BODY_SANITIZE;
    clean = sanitizeHtml(html, options);
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
