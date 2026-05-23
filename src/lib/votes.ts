import { supabase } from "@/lib/supabase";
import { getDisplayNamesByLineUserIds } from "@/lib/members";
import type {
  OwnVote,
  TaskResponseRow,
  VoteMode,
  VoteReasonItem,
  VoteSummary,
} from "@/types";

interface VoteRow {
  task_id: string;
  line_user_id: string;
  selected_option: string;
  reason: string | null;
  created_at: string;
}

// 課題ごとの集計結果を取得 (single / multiple モード用)。
// freetext モードでも total (= 回答した人数) は返したいので呼び出し OK。
// 投票者ユニーク数を total に入れる: 同一ユーザーが複数選択していても 1 人としてカウント。
export async function getVoteSummary(taskId: string): Promise<VoteSummary> {
  const empty: VoteSummary = { total: 0, counts: {} };
  if (!supabase) return empty;
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("line_user_id, selected_option")
      .eq("task_id", taskId);
    if (error) {
      console.error("[votes] getVoteSummary returned error", error);
      return empty;
    }
    const counts: Record<string, number> = {};
    const uniqueVoters = new Set<string>();
    for (const row of data ?? []) {
      const r = row as { line_user_id: string; selected_option: string };
      uniqueVoters.add(r.line_user_id);
      counts[r.selected_option] = (counts[r.selected_option] ?? 0) + 1;
    }
    return { total: uniqueVoters.size, counts };
  } catch (err) {
    console.error("[votes] getVoteSummary threw", err);
    return empty;
  }
}

// 自分の回答 (3 モード共通) を取得。未回答なら null。
// freetext: selected_option に自由記述本文が入っている前提
export async function getOwnVote(
  taskId: string,
  lineUserId: string
): Promise<OwnVote | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("selected_option, reason")
      .eq("task_id", taskId)
      .eq("line_user_id", lineUserId);
    if (error) {
      console.error("[votes] getOwnVote returned error", error);
      return null;
    }
    if (!data || data.length === 0) return null;
    const rows = data as { selected_option: string; reason: string | null }[];
    // reason は single モードで 1 件目に入る前提
    const reason = rows[0].reason;
    return {
      selectedOptions: rows.map((r) => r.selected_option),
      // freetext かどうかは呼び出し側が task.voteMode で判定して使い分け
      freeText: null,
      reason,
    };
  } catch (err) {
    console.error("[votes] getOwnVote threw", err);
    return null;
  }
}

// 課題ごとの理由つき投票一覧 (匿名)。集計の下に「賛成の声」「反対の声」として表示する。
// single モード専用 (multiple は理由非対応, freetext は個人回答なので非公開)。
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

// 自分の回答を完全に取り消す (取り下げ)。
// (task, user) に紐づく行を全削除。castVote の DELETE 部分と同じだが、
// INSERT は行わない。
export async function withdrawVote(
  taskId: string,
  lineUserId: string
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("task_id", taskId)
    .eq("line_user_id", lineUserId);
  if (error) {
    console.error("[votes] withdrawVote failed", error);
    throw new Error("投票の取り消しに失敗しました");
  }
}

// 役員向け: 1 課題分の回答を「回答者単位」でグループ化して取得。
// - single: 1 ユーザー = 1 行 (selectedOptions に 1 件 + reason)
// - multiple: 1 ユーザー = N 行 → selectedOptions に集約
// - freetext: 1 ユーザー = 1 行 (freeText に格納)
// 並び順は created_at 降順 (新しい回答が上)。
export async function getResponsesByTask(
  taskId: string,
  mode: VoteMode
): Promise<TaskResponseRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("line_user_id, selected_option, reason, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[votes] getResponsesByTask error", error);
      return [];
    }
    const rows = (data ?? []) as VoteRow[];
    type Acc = {
      lineUserId: string;
      selectedOptions: string[];
      freeText: string | null;
      reason: string | null;
      createdAt: string;
    };
    const grouped = new Map<string, Acc>();
    for (const r of rows) {
      const acc = grouped.get(r.line_user_id);
      if (!acc) {
        grouped.set(r.line_user_id, {
          lineUserId: r.line_user_id,
          selectedOptions:
            mode === "freetext" ? [] : [r.selected_option],
          freeText: mode === "freetext" ? r.selected_option : null,
          reason: r.reason,
          createdAt: r.created_at,
        });
      } else {
        if (mode === "multiple") {
          if (!acc.selectedOptions.includes(r.selected_option)) {
            acc.selectedOptions.push(r.selected_option);
          }
        }
        if (r.created_at < acc.createdAt) acc.createdAt = r.created_at;
        if (r.reason && !acc.reason) acc.reason = r.reason;
      }
    }
    const ids = Array.from(grouped.keys());
    const nameMap = await getDisplayNamesByLineUserIds(ids);
    const result: TaskResponseRow[] = Array.from(grouped.values()).map((a) => ({
      lineUserId: a.lineUserId,
      displayName: nameMap.get(a.lineUserId) ?? "(未登録)",
      selectedOptions: a.selectedOptions,
      freeText: a.freeText,
      reason: a.reason,
      createdAt: a.createdAt,
    }));
    result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return result;
  } catch (err) {
    console.error("[votes] getResponsesByTask threw", err);
    return [];
  }
}

// 投票を反映 (3 モード共通)。
// 戦略: まず (task, user) に紐づく既存の行を全削除し、その後新しい行を INSERT する。
// - single: 1 行のみ (selected_option + 任意の reason)
// - multiple: N 行 (それぞれ selected_option, reason は null)
// - freetext: 1 行 (selected_option に自由記述本文を格納, reason は null)
//
// 注: Supabase の RLS で votes テーブルへの insert/delete が anon に許可されている前提。
//     1 人あたり最大数件の DELETE/INSERT なので競合は無視できる。
export async function castVote(
  taskId: string,
  lineUserId: string,
  mode: VoteMode,
  selectedOptions: string[],
  freeText: string | null,
  reason: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  // 既存の自分の回答を消す
  const { error: delErr } = await supabase
    .from("votes")
    .delete()
    .eq("task_id", taskId)
    .eq("line_user_id", lineUserId);
  if (delErr) {
    console.error("[votes] delete prev failed", delErr);
    throw new Error("投票の更新に失敗しました");
  }

  // 挿入する行を組み立て
  let rows: {
    task_id: string;
    line_user_id: string;
    selected_option: string;
    reason: string | null;
  }[] = [];
  if (mode === "freetext") {
    if (!freeText) return; // 空送信 (取り消し相当) は INSERT しない
    rows = [
      {
        task_id: taskId,
        line_user_id: lineUserId,
        selected_option: freeText,
        reason: null,
      },
    ];
  } else if (mode === "multiple") {
    rows = selectedOptions.map((opt) => ({
      task_id: taskId,
      line_user_id: lineUserId,
      selected_option: opt,
      reason: null,
    }));
  } else {
    // single
    if (selectedOptions.length === 0) return;
    rows = [
      {
        task_id: taskId,
        line_user_id: lineUserId,
        selected_option: selectedOptions[0],
        reason,
      },
    ];
  }

  if (rows.length === 0) return;
  const { error: insErr } = await supabase.from("votes").insert(rows);
  if (insErr) {
    console.error("[votes] insert failed", insErr);
    throw new Error("投票の保存に失敗しました");
  }
}
