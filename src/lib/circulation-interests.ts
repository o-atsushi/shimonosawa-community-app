import {
  getOwnReactedIds,
  getReactionCount,
  getReactionCounts,
  toggleReaction,
} from "@/lib/circulation-reactions";

// 回覧板に対する「興味ある」機能。Supabase テーブル `circulation_interests`。
const TABLE = "circulation_interests";

export const getInterestCounts = (circulationIds: string[]) =>
  getReactionCounts(TABLE, circulationIds);

export const getInterestCount = (circulationId: string) =>
  getReactionCount(TABLE, circulationId);

export const getOwnInterestedIds = (
  lineUserId: string,
  circulationIds: string[]
) => getOwnReactedIds(TABLE, lineUserId, circulationIds);

export async function toggleInterest(
  circulationId: string,
  lineUserId: string
): Promise<{ interested: boolean; count: number }> {
  const { active, count } = await toggleReaction(TABLE, circulationId, lineUserId);
  return { interested: active, count };
}
