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
  household: string | null;
  selected_option: string;
  reason: string | null;
  created_at: string;
}

// 「投票者キー」: 1 票としてカウントする識別子。
// - household があれば household (世帯単位の集計)
// - 無ければ line_user_id (旧データ後方互換)
function voterKey(row: { household: string | null; line_user_id: string }): string {
  return row.household ?? row.line_user_id;
}

// 課題ごとの集計結果を取得 (single / multiple モード用)。
// freetext モードでも total (= 回答した世帯数) は返したいので呼び出し OK。
// 投票者ユニーク数は世帯単位 (household) で集計し、世帯名未設定の旧投票は
// line_user_id ベースで 1 票としてカウントする。
export async function getVoteSummary(taskId: string): Promise<VoteSummary> {
  const empty: VoteSummary = { total: 0, counts: {} };
  if (!supabase) return empty;
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("line_user_id, household, selected_option")
      .eq("task_id", taskId);
    if (error) {
      console.error("[votes] getVoteSummary returned error", error);
      return empty;
    }
    const counts: Record<string, number> = {};
    const uniqueVoters = new Set<string>();
    for (const row of data ?? []) {
      const r = row as {
        line_user_id: string;
        household: string | null;
        selected_option: string;
      };
      uniqueVoters.add(voterKey(r));
      counts[r.selected_option] = (counts[r.selected_option] ?? 0) + 1;
    }
    return { total: uniqueVoters.size, counts };
  } catch (err) {
    console.error("[votes] getVoteSummary threw", err);
    return empty;
  }
}

// 自分の回答 (3 モード共通) を取得。未回答なら null。
// 世帯名が指定されていれば「同じ世帯名で投じられた回答」を優先的に返す
// (家族の誰かが投票していれば、他のメンバーが開いてもその回答を表示できる)。
// なければ line_user_id 単位で取得 (旧データ後方互換)。
export async function getOwnVote(
  taskId: string,
  lineUserId: string,
  household: string | null = null
): Promise<OwnVote | null> {
  if (!supabase) return null;
  try {
    let rows: { selected_option: string; reason: string | null }[] | null = null;

    // 世帯名指定がある場合、まず世帯名で探す
    if (household) {
      const r = await supabase
        .from("votes")
        .select("selected_option, reason")
        .eq("task_id", taskId)
        .eq("household", household);
      if (r.error) {
        console.error("[votes] getOwnVote (by household) error", r.error);
      } else if (r.data && r.data.length > 0) {
        rows = r.data as { selected_option: string; reason: string | null }[];
      }
    }

    // 世帯名 hit が無ければ line_user_id で探す
    if (!rows) {
      const r = await supabase
        .from("votes")
        .select("selected_option, reason")
        .eq("task_id", taskId)
        .eq("line_user_id", lineUserId);
      if (r.error) {
        console.error("[votes] getOwnVote (by lineUserId) error", r.error);
        return null;
      }
      if (!r.data || r.data.length === 0) return null;
      rows = r.data as { selected_option: string; reason: string | null }[];
    }

    return {
      selectedOptions: rows.map((r) => r.selected_option),
      // freetext かどうかは呼び出し側が task.voteMode で判定して使い分け
      freeText: null,
      reason: rows[0].reason,
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
// 世帯名が指定されていれば該当世帯の行を全部消す + 自分の line_user_id 行も消す。
// 世帯名が無ければ line_user_id ベースで消す (旧来動作)。
export async function withdrawVote(
  taskId: string,
  lineUserId: string,
  household: string | null = null
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  if (household) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("task_id", taskId)
      .eq("household", household);
    if (error) {
      console.error("[votes] withdrawVote by household failed", error);
      throw new Error("投票の取り消しに失敗しました");
    }
  }
  // 自分自身の line_user_id 行 (旧データなど) も消す
  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("task_id", taskId)
    .eq("line_user_id", lineUserId);
  if (error) {
    console.error("[votes] withdrawVote by lineUserId failed", error);
    throw new Error("投票の取り消しに失敗しました");
  }
}

// 役員向け: 1 課題分の回答を「回答者単位」でグループ化して取得。
// グループ化キーは世帯名 (household) があればそれ、無ければ line_user_id。
// 同じ世帯から複数の line_user_id で投票があった場合 (世帯名導入前後の混在等) も
// 世帯名で 1 つにまとまる。
// 並び順は created_at 降順 (新しい回答が上)。
export async function getResponsesByTask(
  taskId: string,
  mode: VoteMode
): Promise<TaskResponseRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("line_user_id, household, selected_option, reason, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[votes] getResponsesByTask error", error);
      return [];
    }
    const rows = (data ?? []) as VoteRow[];
    type Acc = {
      lineUserId: string;
      household: string | null;
      selectedOptions: string[];
      freeText: string | null;
      reason: string | null;
      createdAt: string;
    };
    const grouped = new Map<string, Acc>();
    for (const r of rows) {
      const key = voterKey(r);
      const acc = grouped.get(key);
      if (!acc) {
        grouped.set(key, {
          lineUserId: r.line_user_id,
          household: r.household,
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
        // household が片方欠けていたら拾う
        if (!acc.household && r.household) acc.household = r.household;
      }
    }
    // 表示名は line_user_id ベース。世帯名が分かっていれば「世帯名 (会員名)」として返したい所だが、
    // 当面は displayName をそのまま使い、世帯名は呼び出し側で必要なら付与する。
    const ids = Array.from(grouped.values()).map((a) => a.lineUserId);
    const nameMap = await getDisplayNamesByLineUserIds(ids);
    const result: TaskResponseRow[] = Array.from(grouped.values()).map((a) => ({
      lineUserId: a.lineUserId,
      // 世帯名があればそれを優先表示。無ければ会員名 (旧データ)。
      displayName:
        a.household ?? nameMap.get(a.lineUserId) ?? "(未登録)",
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
// 戦略:
//   1. 同じ世帯名の既存行を全部消す (家族の誰かが投票済みなら上書き)
//   2. 自分の line_user_id の既存行も全部消す (旧データの後方互換)
//   3. household 付きで新規行を INSERT
//
// - single: 1 行 (selected_option + 任意の reason)
// - multiple: N 行 (それぞれ selected_option, reason は null)
// - freetext: 1 行 (selected_option に自由記述本文を格納, reason は null)
//
// 注: Supabase の RLS で votes テーブルへの insert/delete が anon に許可されている前提。
//     世帯名 (household) は今後 NOT NULL を期待するが、本コードは null も受け付ける。
export async function castVote(
  taskId: string,
  lineUserId: string,
  household: string | null,
  mode: VoteMode,
  selectedOptions: string[],
  freeText: string | null,
  reason: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  // 1. 世帯名の既存行を消す
  if (household) {
    const { error: delHouseholdErr } = await supabase
      .from("votes")
      .delete()
      .eq("task_id", taskId)
      .eq("household", household);
    if (delHouseholdErr) {
      console.error("[votes] delete prev by household failed", delHouseholdErr);
      throw new Error("投票の更新に失敗しました");
    }
  }

  // 2. 自分の line_user_id の既存行を消す (旧データ後方互換)
  const { error: delUserErr } = await supabase
    .from("votes")
    .delete()
    .eq("task_id", taskId)
    .eq("line_user_id", lineUserId);
  if (delUserErr) {
    console.error("[votes] delete prev by lineUserId failed", delUserErr);
    throw new Error("投票の更新に失敗しました");
  }

  // 3. 挿入する行を組み立て
  let rows: {
    task_id: string;
    line_user_id: string;
    household: string | null;
    selected_option: string;
    reason: string | null;
  }[] = [];
  if (mode === "freetext") {
    if (!freeText) return; // 空送信 (取り消し相当) は INSERT しない
    rows = [
      {
        task_id: taskId,
        line_user_id: lineUserId,
        household,
        selected_option: freeText,
        reason: null,
      },
    ];
  } else if (mode === "multiple") {
    rows = selectedOptions.map((opt) => ({
      task_id: taskId,
      line_user_id: lineUserId,
      household,
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
        household,
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
