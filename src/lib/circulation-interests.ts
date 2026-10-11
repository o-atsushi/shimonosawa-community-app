import { supabase } from "@/lib/supabase";

// 回覧板に対する「興味あり」機能。
// Supabase テーブル `circulation_interests` (circulation_id, line_user_id, created_at)
// PRIMARY KEY (circulation_id, line_user_id) で「1 人 1 回」を表現。
// 取り消しは行削除で実現する (オフ状態 = 行が無い)。

export async function getInterestCounts(
  circulationIds: string[]
): Promise<Record<string, number>> {
  if (!supabase || circulationIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from("circulation_interests")
      .select("circulation_id")
      .in("circulation_id", circulationIds);
    if (error) {
      console.error("[circulation-interests] getInterestCounts error", error);
      return {};
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { circulation_id: string }).circulation_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  } catch (err) {
    console.error("[circulation-interests] getInterestCounts threw", err);
    return {};
  }
}

export async function getInterestCount(circulationId: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from("circulation_interests")
      .select("circulation_id", { count: "exact", head: true })
      .eq("circulation_id", circulationId);
    if (error) {
      console.error("[circulation-interests] getInterestCount error", error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[circulation-interests] getInterestCount threw", err);
    return 0;
  }
}

// 与えられた候補の中で、自分が「興味あり」にした回覧 id 一覧を返す
export async function getOwnInterestedIds(
  lineUserId: string,
  circulationIds: string[]
): Promise<string[]> {
  if (!supabase || circulationIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("circulation_interests")
      .select("circulation_id")
      .eq("line_user_id", lineUserId)
      .in("circulation_id", circulationIds);
    if (error) {
      console.error("[circulation-interests] getOwnInterestedIds error", error);
      return [];
    }
    return (data ?? []).map(
      (r) => (r as { circulation_id: string }).circulation_id
    );
  } catch (err) {
    console.error("[circulation-interests] getOwnInterestedIds threw", err);
    return [];
  }
}

// 興味ありトグル。既存があれば削除、無ければ追加。
export async function toggleInterest(
  circulationId: string,
  lineUserId: string
): Promise<{ interested: boolean; count: number }> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data: existing, error: selErr } = await supabase
    .from("circulation_interests")
    .select("circulation_id")
    .eq("circulation_id", circulationId)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (selErr) {
    console.error("[circulation-interests] toggleInterest select failed", selErr);
    throw new Error("興味ありの操作に失敗しました");
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from("circulation_interests")
      .delete()
      .eq("circulation_id", circulationId)
      .eq("line_user_id", lineUserId);
    if (delErr) {
      console.error("[circulation-interests] toggleInterest delete failed", delErr);
      throw new Error("興味ありの取り消しに失敗しました");
    }
    const count = await getInterestCount(circulationId);
    return { interested: false, count };
  }

  const { error: insErr } = await supabase
    .from("circulation_interests")
    .insert({
      circulation_id: circulationId,
      line_user_id: lineUserId,
    });
  if (insErr) {
    console.error("[circulation-interests] toggleInterest insert failed", insErr);
    throw new Error("興味ありの登録に失敗しました");
  }
  const count = await getInterestCount(circulationId);
  return { interested: true, count };
}

// 役員向け: 回覧板 1 件に「興味あり」した会員のリストを返す。
// display_name は members テーブルから、未登録なら "(未登録)" を返す。
export async function getInterestedMembers(
  circulationId: string
): Promise<
  { lineUserId: string; displayName: string; createdAt: string }[]
> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("circulation_interests")
      .select("line_user_id, created_at")
      .eq("circulation_id", circulationId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[circulation-interests] getInterestedMembers error", error);
      return [];
    }
    const rows = (data ?? []) as { line_user_id: string; created_at: string }[];
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.line_user_id);
    const { data: memberRows } = await supabase
      .from("members")
      .select("line_user_id, display_name")
      .in("line_user_id", ids);
    const nameMap = new Map<string, string>();
    for (const m of (memberRows ?? []) as {
      line_user_id: string;
      display_name: string;
    }[]) {
      nameMap.set(m.line_user_id, m.display_name);
    }
    return rows.map((r) => ({
      lineUserId: r.line_user_id,
      displayName: nameMap.get(r.line_user_id) ?? "(未登録)",
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("[circulation-interests] getInterestedMembers threw", err);
    return [];
  }
}
