import { supabase } from "@/lib/supabase";
import type { VoteReasonItem, VoteSummary } from "@/types";

interface VoteRow {
  task_id: string;
  line_user_id: string;
  selected_option: string;
  reason: string | null;
  created_at: string;
}

// 課題ごとの集計結果を取得。null の場合 (未設定 / エラー) は空集計を返す。
// クライアント返却前に line_user_id は捨てる (匿名性)。
export async function getVoteSummary(taskId: string): Promise<VoteSummary> {
  const empty: VoteSummary = { total: 0, counts: {} };
  if (!supabase) return empty;
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("selected_option")
      .eq("task_id", taskId);
    if (error) {
      console.error("[votes] getVoteSummary returned error", error);
      return empty;
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const opt = (row as { selected_option: string }).selected_option;
      counts[opt] = (counts[opt] ?? 0) + 1;
    }
    const total = (data ?? []).length;
    return { total, counts };
  } catch (err) {
    console.error("[votes] getVoteSummary threw", err);
    return empty;
  }
}

// 自分の投票 (どの選択肢を選んだか + 理由) を取得。未投票なら null。
export async function getOwnVote(
  taskId: string,
  lineUserId: string
): Promise<{ selectedOption: string; reason: string | null } | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("selected_option, reason")
      .eq("task_id", taskId)
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    if (error) {
      console.error("[votes] getOwnVote returned error", error);
      return null;
    }
    if (!data) return null;
    const row = data as { selected_option: string; reason: string | null };
    return { selectedOption: row.selected_option, reason: row.reason };
  } catch (err) {
    console.error("[votes] getOwnVote threw", err);
    return null;
  }
}

// 課題ごとの理由つき投票一覧 (匿名)。集計の下に「賛成の声」「反対の声」として表示する。
// reason が null/空のレコードは除外。
export async function getVoteReasons(
  taskId: string
): Promise<VoteReasonItem[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("selected_option, reason, created_at")
      .eq("task_id", taskId)
      .not("reason", "is", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[votes] getVoteReasons returned error", error);
      return [];
    }
    return (data ?? [])
      .filter((row) => {
        const r = (row as { reason: string | null }).reason;
        return typeof r === "string" && r.trim().length > 0;
      })
      .map((row) => {
        const r = row as VoteRow;
        return {
          option: r.selected_option,
          reason: r.reason ?? "",
          createdAt: r.created_at,
        };
      });
  } catch (err) {
    console.error("[votes] getVoteReasons threw", err);
    return [];
  }
}

// 投票 / 変更 (UPSERT)。1人1票 (UNIQUE task_id + line_user_id)
// reason は任意。null を渡すと理由なしで保存 (上書きで既存理由を消す)
export async function castVote(
  taskId: string,
  lineUserId: string,
  selectedOption: string,
  reason: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { error } = await supabase
    .from("votes")
    .upsert(
      {
        task_id: taskId,
        line_user_id: lineUserId,
        selected_option: selectedOption,
        reason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "task_id,line_user_id" }
    );
  if (error) {
    console.error("[votes] castVote failed", error);
    throw new Error("投票に失敗しました");
  }
}
