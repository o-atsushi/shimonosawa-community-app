import { supabase } from "@/lib/supabase";
import type { Comment, CommentInput } from "@/types";

interface CommentRow {
  id: string;
  task_id: string;
  body: string;
  created_at: string;
}

function formatComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function getCommentsByTaskId(taskId: string): Promise<Comment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("comments")
    .select("id, task_id, body, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[comments] getCommentsByTaskId failed", error);
    return [];
  }
  return (data ?? []).map(formatComment);
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
