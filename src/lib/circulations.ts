import { supabase } from "@/lib/supabase";
import type { Circulation } from "@/types";

interface CirculationRow {
  id: string;
  title: string;
  image_urls: string[] | null;
  uploaded_by_line_user_id: string | null;
  created_at: string;
}

function formatCirculation(row: CirculationRow): Circulation {
  return {
    id: row.id,
    title: row.title,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    uploadedByLineUserId: row.uploaded_by_line_user_id,
    createdAt: row.created_at,
  };
}

// 一覧取得 (新しい順)
export async function getCirculations(): Promise<Circulation[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("circulations")
      .select(
        "id, title, image_urls, uploaded_by_line_user_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[circulations] getCirculations error", error);
      return [];
    }
    return (data ?? []).map((r) => formatCirculation(r as CirculationRow));
  } catch (err) {
    console.error("[circulations] getCirculations threw", err);
    return [];
  }
}

// 単一取得
export async function getCirculation(id: string): Promise<Circulation | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("circulations")
      .select(
        "id, title, image_urls, uploaded_by_line_user_id, created_at"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[circulations] getCirculation error", error);
      return null;
    }
    if (!data) return null;
    return formatCirculation(data as CirculationRow);
  } catch (err) {
    console.error("[circulations] getCirculation threw", err);
    return null;
  }
}

// 新規作成 (役員のみ呼ぶ想定。認可は呼び出し側の API ハンドラで行う)
export async function createCirculation(
  title: string,
  imageUrls: string[],
  lineUserId: string
): Promise<Circulation> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { data, error } = await supabase
    .from("circulations")
    .insert({
      title,
      image_urls: imageUrls,
      uploaded_by_line_user_id: lineUserId,
    })
    .select("id, title, image_urls, uploaded_by_line_user_id, created_at")
    .single();
  if (error || !data) {
    console.error("[circulations] createCirculation error", error);
    throw new Error("回覧板の保存に失敗しました");
  }
  return formatCirculation(data as CirculationRow);
}

// 削除 (役員のみ。認可は呼び出し側で行う)
export async function deleteCirculation(id: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  const { error } = await supabase.from("circulations").delete().eq("id", id);
  if (error) {
    console.error("[circulations] deleteCirculation error", error);
    throw new Error("回覧板の削除に失敗しました");
  }
}
