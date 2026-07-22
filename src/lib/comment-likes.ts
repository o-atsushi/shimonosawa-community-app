import { supabase } from "@/lib/supabase";

// コメントへの 👍 機能。
// Supabase テーブル `comment_likes` (comment_id, line_user_id, created_at)
// PRIMARY KEY (comment_id, line_user_id) で「1 人 1 いいね」を表現。
// 取り消しは行削除で実現する (オフ状態 = 行が無い)。

export async function getLikeCounts(
  commentIds: string[]
): Promise<Record<string, number>> {
  if (!supabase || commentIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .in("comment_id", commentIds);
    if (error) {
      console.error("[comment-likes] getLikeCounts returned error", error);
      return {};
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { comment_id: string }).comment_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  } catch (err) {
    console.error("[comment-likes] getLikeCounts threw", err);
    return {};
  }
}

export async function getLikeCount(commentId: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from("comment_likes")
      .select("comment_id", { count: "exact", head: true })
      .eq("comment_id", commentId);
    if (error) {
      console.error("[comment-likes] getLikeCount returned error", error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[comment-likes] getLikeCount threw", err);
    return 0;
  }
}

// 自分がいいねしたコメント id を、与えられた候補内から返す
export async function getOwnLikedIds(
  lineUserId: string,
  commentIds: string[]
): Promise<string[]> {
  if (!supabase || commentIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("line_user_id", lineUserId)
      .in("comment_id", commentIds);
    if (error) {
      console.error("[comment-likes] getOwnLikedIds returned error", error);
      return [];
    }
    return (data ?? []).map((r) => (r as { comment_id: string }).comment_id);
  } catch (err) {
    console.error("[comment-likes] getOwnLikedIds threw", err);
    return [];
  }
}

// いいねトグル。既存があれば削除、無ければ追加。
export async function toggleLike(
  commentId: string,
  lineUserId: string
): Promise<{ liked: boolean; count: number }> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data: existing, error: selErr } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (selErr) {
    console.error("[comment-likes] toggleLike select failed", selErr);
    throw new Error("いいねの操作に失敗しました");
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("line_user_id", lineUserId);
    if (delErr) {
      console.error("[comment-likes] toggleLike delete failed", delErr);
      throw new Error("いいねの取消に失敗しました");
    }
    const count = await getLikeCount(commentId);
    return { liked: false, count };
  }

  const { error: insErr } = await supabase
    .from("comment_likes")
    .upsert(
      { comment_id: commentId, line_user_id: lineUserId },
      { onConflict: "comment_id,line_user_id", ignoreDuplicates: true }
    );
  if (insErr) {
    console.error("[comment-likes] toggleLike insert failed", insErr);
    throw new Error("いいねの登録に失敗しました");
  }
  const count = await getLikeCount(commentId);
  return { liked: true, count };
}
