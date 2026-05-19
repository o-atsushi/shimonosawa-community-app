import { supabase } from "@/lib/supabase";
import type { OwnRsvp, RsvpResponse, RsvpSummary } from "@/types";

// 集計結果を取得。null/エラー時は空集計を返す。
export async function getRsvpSummary(articleId: string): Promise<RsvpSummary> {
  const empty: RsvpSummary = {
    total: 0,
    counts: { attending: 0, skipping: 0, alt_done: 0 },
  };
  if (!supabase) return empty;
  try {
    const { data, error } = await supabase
      .from("cleanup_rsvps")
      .select("response")
      .eq("article_id", articleId);
    if (error) {
      console.error("[rsvps] getRsvpSummary returned error", error);
      return empty;
    }
    const counts: Record<RsvpResponse, number> = {
      attending: 0,
      skipping: 0,
      alt_done: 0,
    };
    for (const row of data ?? []) {
      const r = (row as { response: RsvpResponse }).response;
      if (r in counts) counts[r] += 1;
    }
    const total = (data ?? []).length;
    return { total, counts };
  } catch (err) {
    console.error("[rsvps] getRsvpSummary threw", err);
    return empty;
  }
}

// 自分のRSVPを取得。未回答なら null。
export async function getOwnRsvp(
  articleId: string,
  lineUserId: string
): Promise<OwnRsvp | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("cleanup_rsvps")
      .select("response, alt_date, note")
      .eq("article_id", articleId)
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    if (error) {
      console.error("[rsvps] getOwnRsvp returned error", error);
      return null;
    }
    if (!data) return null;
    const row = data as {
      response: RsvpResponse;
      alt_date: string | null;
      note: string | null;
    };
    return {
      response: row.response,
      altDate: row.alt_date,
      note: row.note,
    };
  } catch (err) {
    console.error("[rsvps] getOwnRsvp threw", err);
    return null;
  }
}

// 参加表明 / 変更 (UPSERT)。1人1回答 per article_id
// alt_date と note は null OK
export async function castRsvp(
  articleId: string,
  lineUserId: string,
  response: RsvpResponse,
  altDate: string | null,
  note: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { error } = await supabase.from("cleanup_rsvps").upsert(
    {
      article_id: articleId,
      line_user_id: lineUserId,
      response,
      alt_date: altDate,
      note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "article_id,line_user_id" }
  );
  if (error) {
    console.error("[rsvps] castRsvp failed", error);
    throw new Error("回答に失敗しました");
  }
}

