import { supabase } from "@/lib/supabase";
import type { ArticleComment, ArticleCommentInput } from "@/types";

interface ArticleCommentRow {
  id: string;
  article_id: string;
  body: string;
  created_at: string;
  line_user_id: string;
}

function formatArticleComment(row: ArticleCommentRow): ArticleComment {
  return {
    id: row.id,
    articleId: row.article_id,
    body: row.body,
    createdAt: row.created_at,
    lineUserId: row.line_user_id,
  };
}

// お知らせ記事に紐づくコメント一覧を新しい順で取得。
// ソフトデリート済み (deleted_at IS NOT NULL) は除外。
export async function getArticleComments(
  articleId: string
): Promise<ArticleComment[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("article_comments")
      .select("id, article_id, body, created_at, line_user_id")
      .eq("article_id", articleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[article-comments] get failed", error);
      return [];
    }
    return (data ?? []).map((r) => formatArticleComment(r as ArticleCommentRow));
  } catch (err) {
    // Supabase 設定不備 / ネットワーク不通で SSR 500 を防ぐため広めに catch
    console.error("[article-comments] get threw", err);
    return [];
  }
}

export async function createArticleComment(
  input: ArticleCommentInput
): Promise<{ id: string }> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data, error } = await supabase
    .from("article_comments")
    .insert({
      article_id: input.articleId,
      line_user_id: input.lineUserId,
      body: input.body,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[article-comments] create failed", error);
    throw new Error("コメント投稿に失敗しました");
  }
  return { id: data.id };
}

// 投稿者本人によるソフトデリート。
// WHERE で line_user_id を必須にし、他人のコメントを誤って更新しないようにする。
// 戻り値: 更新できた行数 (0 なら所有権無し or 既に削除済み)
export async function softDeleteArticleComment(
  id: string,
  lineUserId: string
): Promise<number> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data, error } = await supabase
    .from("article_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("line_user_id", lineUserId)
    .is("deleted_at", null)
    .select("id");
  if (error) {
    console.error("[article-comments] softDelete failed", error);
    throw new Error("削除に失敗しました");
  }
  return (data ?? []).length;
}
