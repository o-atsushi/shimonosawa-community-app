import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AccessCode, AccessCodeInput } from "@/types";

interface AccessCodeRow {
  id: string;
  code: string;
  description: string | null;
  valid_until: string | null;
  created_at: string;
}

function formatAccessCode(row: AccessCodeRow): AccessCode {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    validUntil: row.valid_until,
    createdAt: row.created_at,
  };
}

export async function getAllAccessCodes(): Promise<AccessCode[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("access_codes")
      .select("id, code, description, valid_until, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[access-codes] getAll error", error);
      return [];
    }
    return (data ?? []).map((r) => formatAccessCode(r as AccessCodeRow));
  } catch (err) {
    console.error("[access-codes] getAll threw", err);
    return [];
  }
}

// 入力コードが有効か確認 (大小無視、期限内)
export async function verifyAccessCode(code: string): Promise<AccessCode | null> {
  if (!supabaseAdmin) return null;
  const normalized = code.trim();
  if (!normalized) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("access_codes")
      .select("id, code, description, valid_until, created_at")
      .ilike("code", normalized)
      .maybeSingle();
    if (error || !data) return null;
    const ac = formatAccessCode(data as AccessCodeRow);
    if (ac.validUntil) {
      const expires = new Date(ac.validUntil + "T23:59:59");
      if (Date.now() > expires.getTime()) return null;
    }
    return ac;
  } catch (err) {
    console.error("[access-codes] verify threw", err);
    return null;
  }
}

export async function createAccessCode(
  input: AccessCodeInput
): Promise<AccessCode> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const code = input.code.trim();
  if (!code || code.length > 50) {
    throw new Error("コードは1〜50文字で入力してください");
  }
  if (input.description != null && input.description.length > 200) {
    throw new Error("説明は200文字以内で入力してください");
  }
  if (input.validUntil != null && !/^\d{4}-\d{2}-\d{2}$/.test(input.validUntil)) {
    throw new Error("有効期限は YYYY-MM-DD で入力してください");
  }
  const { data, error } = await supabaseAdmin
    .from("access_codes")
    .insert({
      code,
      description: input.description ?? null,
      valid_until: input.validUntil ?? null,
    })
    .select("id, code, description, valid_until, created_at")
    .single();
  if (error || !data) {
    console.error("[access-codes] create failed", error);
    throw new Error("アクセスコードの追加に失敗しました");
  }
  return formatAccessCode(data as AccessCodeRow);
}

export async function deleteAccessCode(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const { error } = await supabaseAdmin
    .from("access_codes")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[access-codes] delete failed", error);
    throw new Error("アクセスコードの削除に失敗しました");
  }
}
