import { supabase } from "@/lib/supabase";
import type { Comment, CommentInput } from "@/types";

interface CommentRow {
  id: string;
  task_id: string;
  body: string;
  created_at: string;
  line_user_id: string;
}

function formatComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    body: row.body,
    createdAt: row.created_at,
    lineUserId: row.line_user_id,
  };
}

export async function getCommentsByTaskId(taskId: string): Promise<Comment[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("comments")
      .select("id, task_id, body, created_at, line_user_id")
      .eq("task_id", taskId)
      .is("deleted_at", null) // ソフトデリート済みは除外
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[comments] getCommentsByTaskId returned error", error);
      return [];
    }
    return (data ?? []).map(formatComment);
  } catch (err) {
    // Supabase URL が誤設定 / プロジェクト一時停止 / ネットワーク不通の場合
    // 例外が直接 throw されるためここでキャッチしてページの500を防ぐ
    console.error("[comments] getCommentsByTaskId threw", err);
    return [];
  }
}

export async function createComment(input: CommentInput): Promise<{ id: string }> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data, error } = await supabase
    .from("comments")
    .insert({
      task_id: input.taskId,
      line_user_id: input.lineUserId,
      body: input.body,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[comments] createComment failed", error);
    throw new Error("コメント投稿に失敗しました");
  }
  return { id: data.id };
}

// 投稿者本人によるソフトデリート。
// WHERE 句に line_user_id を入れて他人のコメントを誤更新しないようにする。
// 戻り値: 削除できた行数 (0 なら所有権なし or 既に削除済み)
export async function softDeleteComment(
  id: string,
  lineUserId: string
): Promise<number> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data, error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("line_user_id", lineUserId)
    .is("deleted_at", null)
    .select("id");
  if (error) {
    console.error("[comments] softDeleteComment failed", error);
    throw new Error("削除に失敗しました");
  }
  return (data ?? []).length;
}
