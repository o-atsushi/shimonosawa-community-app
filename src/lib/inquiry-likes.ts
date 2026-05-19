import { supabase } from "@/lib/supabase";

// 要望/質問へのいいね機能。
// Supabase テーブル `inquiry_likes` (inquiry_id, line_user_id, created_at)
// PRIMARY KEY (inquiry_id, line_user_id) で「1人1いいね」を表現。
// 取り消しは行削除で実現する (オフ状態 = 行が無い)。

// 複数の投稿について、いいね数をまとめて取得する。
// 一覧ページで使う。未取得 / エラー時は空オブジェクトを返す。
export async function getLikeCounts(
  inquiryIds: string[]
): Promise<Record<string, number>> {
  if (!supabase || inquiryIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from("inquiry_likes")
      .select("inquiry_id")
      .in("inquiry_id", inquiryIds);
    if (error) {
      console.error("[inquiry-likes] getLikeCounts returned error", error);
      return {};
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { inquiry_id: string }).inquiry_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  } catch (err) {
    console.error("[inquiry-likes] getLikeCounts threw", err);
    return {};
  }
}

// 単一投稿のいいね数 (詳細ページ用)
export async function getLikeCount(inquiryId: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from("inquiry_likes")
      .select("inquiry_id", { count: "exact", head: true })
      .eq("inquiry_id", inquiryId);
    if (error) {
      console.error("[inquiry-likes] getLikeCount returned error", error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[inquiry-likes] getLikeCount threw", err);
    return 0;
  }
}

// 自分が「いいね」した投稿の id 一覧を返す (与えられた候補内に絞り込み)。
// クライアントから fetch される想定 (Server Component では viewer 不明のため)。
export async function getOwnLikedIds(
  lineUserId: string,
  inquiryIds: string[]
): Promise<string[]> {
  if (!supabase || inquiryIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("inquiry_likes")
      .select("inquiry_id")
      .eq("line_user_id", lineUserId)
      .in("inquiry_id", inquiryIds);
    if (error) {
      console.error("[inquiry-likes] getOwnLikedIds returned error", error);
      return [];
    }
    return (data ?? []).map((r) => (r as { inquiry_id: string }).inquiry_id);
  } catch (err) {
    console.error("[inquiry-likes] getOwnLikedIds threw", err);
    return [];
  }
}

// いいねのトグル。既存があれば削除、無ければ追加。
// 返り値は「操作後の自分の状態」と「最新の総いいね数」。
export async function toggleLike(
  inquiryId: string,
  lineUserId: string
): Promise<{ liked: boolean; count: number }> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  // 既存有無を確認
  const { data: existing, error: selErr } = await supabase
    .from("inquiry_likes")
    .select("inquiry_id")
    .eq("inquiry_id", inquiryId)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (selErr) {
    console.error("[inquiry-likes] toggleLike select failed", selErr);
    throw new Error("いいねの操作に失敗しました");
  }

  if (existing) {
    // ある → 削除
    const { error: delErr } = await supabase
      .from("inquiry_likes")
      .delete()
      .eq("inquiry_id", inquiryId)
      .eq("line_user_id", lineUserId);
    if (delErr) {
      console.error("[inquiry-likes] toggleLike delete failed", delErr);
      throw new Error("いいねの取消に失敗しました");
    }
    const count = await getLikeCount(inquiryId);
    return { liked: false, count };
  }

  // 無い → 追加 (UPSERT で念のため race 安全に)
  const { error: insErr } = await supabase
    .from("inquiry_likes")
    .upsert(
      { inquiry_id: inquiryId, line_user_id: lineUserId },
      { onConflict: "inquiry_id,line_user_id", ignoreDuplicates: true }
    );
  if (insErr) {
    console.error("[inquiry-likes] toggleLike insert failed", insErr);
    throw new Error("いいねの登録に失敗しました");
  }
  const count = await getLikeCount(inquiryId);
  return { liked: true, count };
}
