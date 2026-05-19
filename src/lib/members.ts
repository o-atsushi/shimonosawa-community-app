import { supabaseAdmin } from "@/lib/supabase-admin";
import { MEMBER_COLUMNS, formatMember } from "@/lib/auth";
import type { Member, MemberInput, MemberRole } from "@/types";

const VALID_ROLES: MemberRole[] = ["member", "associate"];
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function getAllMembers(): Promise<Member[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("members")
      .select(MEMBER_COLUMNS)
      .order("member_number", { ascending: true });
    if (error) {
      console.error("[members] getAllMembers error", error);
      return [];
    }
    return (data ?? []).map((r) =>
      formatMember(r as Parameters<typeof formatMember>[0])
    );
  } catch (err) {
    console.error("[members] getAllMembers threw", err);
    return [];
  }
}

export async function getMember(id: string): Promise<Member | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("members")
      .select(MEMBER_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return formatMember(data as Parameters<typeof formatMember>[0]);
  } catch (err) {
    console.error("[members] getMember threw", err);
    return null;
  }
}

function validateMemberInput(input: MemberInput): string | null {
  if (
    !input.displayName ||
    typeof input.displayName !== "string" ||
    input.displayName.trim().length === 0 ||
    input.displayName.length > 100
  ) {
    return "氏名を入力してください (100文字以内)";
  }
  if (!VALID_ROLES.includes(input.role)) {
    return "会員種別が不正です";
  }
  if (
    input.lineUserId != null &&
    input.lineUserId !== "" &&
    !LINE_USER_ID_PATTERN.test(input.lineUserId)
  ) {
    return "LINE userId の形式が不正です";
  }
  if (input.household != null && input.household.length > 100) {
    return "世帯情報は100文字以内で入力してください";
  }
  if (input.notes != null && input.notes.length > 500) {
    return "備考は500文字以内で入力してください";
  }
  if (
    input.joinedAt != null &&
    input.joinedAt !== "" &&
    !DATE_PATTERN.test(input.joinedAt)
  ) {
    return "入会日 (YYYY-MM-DD) が不正です";
  }
  return null;
}

export async function createMember(input: MemberInput): Promise<Member> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const err = validateMemberInput(input);
  if (err) throw new Error(err);
  const { data, error } = await supabaseAdmin
    .from("members")
    .insert({
      display_name: input.displayName.trim(),
      role: input.role,
      line_user_id: input.lineUserId || null,
      household: input.household ?? null,
      notes: input.notes ?? null,
      is_admin: input.isAdmin ?? false,
      joined_at: input.joinedAt || null,
    })
    .select(MEMBER_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[members] createMember failed", error);
    throw new Error("会員の追加に失敗しました");
  }
  return formatMember(data as Parameters<typeof formatMember>[0]);
}

export async function updateMember(
  id: string,
  input: MemberInput
): Promise<Member> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const err = validateMemberInput(input);
  if (err) throw new Error(err);
  const { data, error } = await supabaseAdmin
    .from("members")
    .update({
      display_name: input.displayName.trim(),
      role: input.role,
      line_user_id: input.lineUserId || null,
      household: input.household ?? null,
      notes: input.notes ?? null,
      is_admin: input.isAdmin ?? false,
      joined_at: input.joinedAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(MEMBER_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[members] updateMember failed", error);
    throw new Error("会員の更新に失敗しました");
  }
  return formatMember(data as Parameters<typeof formatMember>[0]);
}

export async function deleteMember(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const { error } = await supabaseAdmin
    .from("members")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[members] deleteMember failed", error);
    throw new Error("会員の削除に失敗しました");
  }
}
