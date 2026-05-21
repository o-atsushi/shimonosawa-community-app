// リッチエディタ (HTML) から、カードのプレビュー用に
// ざっくりプレーンテキストの抜粋を取り出すユーティリティ。
//
// 厳密な HTML パースはせず、タグを正規表現で剥がす簡易実装。
// 表示用なので XSS リスクはなし (sanitize は ArticleBody 側の責務)。
export function bodyExcerpt(
  html: string | null | undefined,
  max = 120
): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}
