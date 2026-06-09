import { supabase } from "@/lib/supabase";
import { getDisplayNamesByLineUserIds } from "@/lib/members";
import type { CirculationViewStats, CirculationViewer } from "@/types";

// 1 回分の閲覧を記録 (常に INSERT、PV カウント方針)。
// 集計はクエリ時に行う。
export async function recordView(
  circulationId: string,
  lineUserId: string
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("circulation_views").insert({
      circulation_id: circulationId,
      line_user_id: lineUserId,
    });
    if (error) {
      // 致命的エラーではない (記録漏れだけ) のでスタックは出すが throw はしない
      console.warn("[circulation-views] recordView error", error);
    }
  } catch (err) {
    console.warn("[circulation-views] recordView threw", err);
  }
}

// 1 件分の閲覧統計を取得 (役員専用 API から呼ぶ)。
// 行を全件取得して JS 側で集計する: 件数が少ない想定なので OK。
export async function getViewStats(
  circulationId: string
): Promise<CirculationViewStats> {
  const empty: CirculationViewStats = {
    totalViews: 0,
    uniqueViewers: 0,
    viewers: [],
  };
  if (!supabase) return empty;
  try {
    const { data, error } = await supabase
      .from("circulation_views")
      .select("line_user_id, viewed_at")
      .eq("circulation_id", circulationId)
      .order("viewed_at", { ascending: false });
    if (error) {
      console.error("[circulation-views] getViewStats error", error);
      return empty;
    }
    const rows = (data ?? []) as { line_user_id: string; viewed_at: string }[];
    const totalViews = rows.length;

    // ユーザーごとに集約
    type Acc = { count: number; first: string; last: string };
    const map = new Map<string, Acc>();
    for (const r of rows) {
      const acc = map.get(r.line_user_id);
      if (!acc) {
        map.set(r.line_user_id, {
          count: 1,
          first: r.viewed_at,
          last: r.viewed_at,
        });
      } else {
        acc.count += 1;
        if (r.viewed_at < acc.first) acc.first = r.viewed_at;
        if (r.viewed_at > acc.last) acc.last = r.viewed_at;
      }
    }
    const userIds = Array.from(map.keys());
    const nameMap = await getDisplayNamesByLineUserIds(userIds);
    const viewers: CirculationViewer[] = userIds.map((uid) => {
      const a = map.get(uid)!;
      return {
        lineUserId: uid,
        displayName: nameMap.get(uid) ?? "(未登録)",
        viewCount: a.count,
        firstViewedAt: a.first,
        lastViewedAt: a.last,
      };
    });
    // 最新閲覧が新しい順に並べる
    viewers.sort((a, b) => (a.lastViewedAt < b.lastViewedAt ? 1 : -1));

    return {
      totalViews,
      uniqueViewers: viewers.length,
      viewers,
    };
  } catch (err) {
    console.error("[circulation-views] getViewStats threw", err);
    return empty;
  }
}

// 一覧ページ用: 複数の回覧板の「延べ PV」を一括取得する。
// 役員 UI で一覧上に「閲覧 N 件」を出したい場合に使う。
export async function getViewCounts(
  circulationIds: string[]
): Promise<Record<string, number>> {
  const empty: Record<string, number> = {};
  if (!supabase || circulationIds.length === 0) return empty;
  try {
    const { data, error } = await supabase
      .from("circulation_views")
      .select("circulation_id")
      .in("circulation_id", circulationIds);
    if (error) {
      console.error("[circulation-views] getViewCounts error", error);
      return empty;
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { circulation_id: string }).circulation_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  } catch (err) {
    console.error("[circulation-views] getViewCounts threw", err);
    return empty;
  }
}
