import {
  getOwnReactedIds,
  getReactionCount,
  toggleReaction,
} from "@/lib/circulation-reactions";

// 回覧板に対する「紙配布希望」。Supabase テーブル `circulation_paper_requests`。
// 紙で配る運用の判断材料として、希望の有無を後から集計するためのもの。
const TABLE = "circulation_paper_requests";

export const getPaperRequestCount = (circulationId: string) =>
  getReactionCount(TABLE, circulationId);

export const getOwnPaperRequestedIds = (
  lineUserId: string,
  circulationIds: string[]
) => getOwnReactedIds(TABLE, lineUserId, circulationIds);

export async function togglePaperRequest(
  circulationId: string,
  lineUserId: string
): Promise<{ requested: boolean; count: number }> {
  const { active, count } = await toggleReaction(TABLE, circulationId, lineUserId);
  return { requested: active, count };
}
