import { supabase } from "@/lib/supabase";

// 回覧板への「1 人 1 回」トグル型リアクション (興味ある / 紙配布希望) の共通実装。
// 各テーブルは (circulation_id, line_user_id, created_at) で
// PRIMARY KEY (circulation_id, line_user_id)。オフ状態 = 行が無い。
// 誰が押したかはアプリ画面には出さず、必要な時に Supabase 上で直接見る運用。

export type ReactionTable = "circulation_interests" | "circulation_paper_requests";

const tag = (table: ReactionTable) => `[${table}]`;

export async function getReactionCounts(
  table: ReactionTable,
  circulationIds: string[]
): Promise<Record<string, number>> {
  if (!supabase || circulationIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from(table)
      .select("circulation_id")
      .in("circulation_id", circulationIds);
    if (error) {
      console.error(tag(table), "getReactionCounts error", error);
      return {};
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { circulation_id: string }).circulation_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  } catch (err) {
    console.error(tag(table), "getReactionCounts threw", err);
    return {};
  }
}

export async function getReactionCount(
  table: ReactionTable,
  circulationId: string
): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from(table)
      .select("circulation_id", { count: "exact", head: true })
      .eq("circulation_id", circulationId);
    if (error) {
      console.error(tag(table), "getReactionCount error", error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error(tag(table), "getReactionCount threw", err);
    return 0;
  }
}

// 与えられた候補の中で、自分が押している回覧 id 一覧を返す
export async function getOwnReactedIds(
  table: ReactionTable,
  lineUserId: string,
  circulationIds: string[]
): Promise<string[]> {
  if (!supabase || circulationIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from(table)
      .select("circulation_id")
      .eq("line_user_id", lineUserId)
      .in("circulation_id", circulationIds);
    if (error) {
      console.error(tag(table), "getOwnReactedIds error", error);
      return [];
    }
    return (data ?? []).map(
      (r) => (r as { circulation_id: string }).circulation_id
    );
  } catch (err) {
    console.error(tag(table), "getOwnReactedIds threw", err);
    return [];
  }
}

// トグル。既存があれば削除、無ければ追加。
export async function toggleReaction(
  table: ReactionTable,
  circulationId: string,
  lineUserId: string
): Promise<{ active: boolean; count: number }> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data: existing, error: selErr } = await supabase
    .from(table)
    .select("circulation_id")
    .eq("circulation_id", circulationId)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (selErr) {
    console.error(tag(table), "toggle select failed", selErr);
    throw new Error("操作に失敗しました");
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from(table)
      .delete()
      .eq("circulation_id", circulationId)
      .eq("line_user_id", lineUserId);
    if (delErr) {
      console.error(tag(table), "toggle delete failed", delErr);
      throw new Error("取り消しに失敗しました");
    }
    return { active: false, count: await getReactionCount(table, circulationId) };
  }

  const { error: insErr } = await supabase
    .from(table)
    .insert({ circulation_id: circulationId, line_user_id: lineUserId });
  if (insErr) {
    console.error(tag(table), "toggle insert failed", insErr);
    throw new Error("登録に失敗しました");
  }
  return { active: true, count: await getReactionCount(table, circulationId) };
}
