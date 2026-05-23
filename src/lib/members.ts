import { supabase } from "@/lib/supabase";
import type { Member } from "@/types";

interface MemberRow {
  id: string;
  line_user_id: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

function formatMember(row: MemberRow): Member {
  return {
    id: row.id,
    lineUserId: row.line_user_id,
    displayName: row.display_name,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// LINE userId から会員を取得。未登録なら null。
export async function getMemberByLineUserId(
  lineUserId: string
): Promise<Member | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("members")
      .select("id, line_user_id, display_name, is_admin, created_at, updated_at")
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    if (error) {
      console.error("[members] getMemberByLineUserId error", error);
      return null;
    }
    if (!data) return null;
    return formatMember(data as MemberRow);
  } catch (err) {
    console.error("[members] getMemberByLineUserId threw", err);
    return null;
  }
}

// LIFF 初回アクセス時の自動登録 (upsert)。
// 既存なら何もしない (display_name は手動更新時のために上書きしない方針)。
export async function upsertMemberOnLogin(
  lineUserId: string,
  displayName: string
): Promise<Member | null> {
  if (!supabase) return null;
  const safeName =
    displayName && displayName.trim().length > 0
      ? displayName.slice(0, 100)
      : "住民";
  try {
    // 既にあるかどうか
    const existing = await getMemberByLineUserId(lineUserId);
    if (existing) return existing;

    const { data, error } = await supabase
      .from("members")
      .insert({
        line_user_id: lineUserId,
        display_name: safeName,
      })
      .select(
        "id, line_user_id, display_name, is_admin, created_at, updated_at"
      )
      .single();
    if (error) {
      // 同時アクセスで重複 (unique violation) → もう一度 SELECT してみる
      console.warn("[members] insert failed, retrying select", error);
      return await getMemberByLineUserId(lineUserId);
    }
    return formatMember(data as MemberRow);
  } catch (err) {
    console.error("[members] upsertMemberOnLogin threw", err);
    return null;
  }
}

// LINE userId が役員 (is_admin = true) か判定。
// 未登録 / 取得失敗時は false。
export async function isAdminLineUser(lineUserId: string): Promise<boolean> {
  const m = await getMemberByLineUserId(lineUserId);
  return !!m?.isAdmin;
}

// 複数の line_user_id をまとめて引いて、id → 会員名のマップを返す。
// 未登録の lineUserId はマップに含まれない (呼び出し側で「(未登録)」表記など)
export async function getDisplayNamesByLineUserIds(
  lineUserIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!supabase || lineUserIds.length === 0) return map;
  try {
    const uniq = Array.from(new Set(lineUserIds));
    const { data, error } = await supabase
      .from("members")
      .select("line_user_id, display_name")
      .in("line_user_id", uniq);
    if (error) {
      console.error("[members] getDisplayNamesByLineUserIds error", error);
      return map;
    }
    for (const row of data ?? []) {
      const r = row as { line_user_id: string; display_name: string };
      map.set(r.line_user_id, r.display_name);
    }
    return map;
  } catch (err) {
    console.error("[members] getDisplayNamesByLineUserIds threw", err);
    return map;
  }
}
