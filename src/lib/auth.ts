import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Member, MemberRole, ServerAuthStatus } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 現在の年度 (4月始まり)
export function currentFiscalYear(now: Date = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

// 指定年度において会員が在籍した月数 (1〜12)。
// 4月始まりの年度を前提とし、
// - joinedAt が当年度の年度始め (4/1) 以前 → 12 ヶ月
// - joinedAt が来年度以降          → 0 ヶ月
// - 年度途中入会                    → 入会月から年度末 (翌3月) までの月数
// 入会月「以降」のカウントなので、7月入会 → 9ヶ月、1月入会 → 3ヶ月。
export function monthsInFiscalYear(
  fiscalYear: number,
  joinedAt: string | null | undefined,
  now: Date = new Date()
): number {
  // 既に翌年度に入った場合は当年度はもう存在しないので 0
  const fyStart = new Date(fiscalYear, 3, 1); // 4月1日
  const nextFyStart = new Date(fiscalYear + 1, 3, 1);
  // 未設定 = 年度始めから扱い
  if (!joinedAt) return 12;
  const joined = new Date(joinedAt);
  if (Number.isNaN(joined.getTime())) return 12;
  if (joined < fyStart) return 12;
  if (joined >= nextFyStart) return 0;
  // 当年度内: 入会月から年度末までの月数
  const joinedMonth = joined.getMonth() + 1; // 1-12
  // 4月入会=12, 5月=11, ..., 12月=4, 1月=3, 2月=2, 3月=1
  const remaining = joinedMonth >= 4 ? 16 - joinedMonth : 4 - joinedMonth;
  // now (現在) が年度内ならそのままだが、now が後ろに進んだ場合も
  // 「在籍可能だった月数」は当初の remaining と同じ (請求額として動かさない)。
  void now;
  return remaining;
}

// 年額と入会日から、当年度に住民が支払うべき期待額を計算する。
// 月割は ceil で繰り上げ (端数は会員負担、自治会側のリスク低減)。
export function expectedAmount(
  annualAmount: number,
  fiscalYear: number,
  joinedAt: string | null | undefined
): number {
  if (annualAmount <= 0) return 0;
  const months = monthsInFiscalYear(fiscalYear, joinedAt);
  if (months <= 0) return 0;
  if (months >= 12) return annualAmount;
  return Math.ceil((annualAmount * months) / 12);
}

interface MemberRow {
  id: string;
  member_number: number;
  display_name: string;
  role: MemberRole;
  line_user_id: string | null;
  household: string | null;
  notes: string | null;
  is_admin: boolean;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export function formatMember(row: MemberRow): Member {
  return {
    id: row.id,
    memberNumber: row.member_number,
    displayName: row.display_name,
    role: row.role,
    lineUserId: row.line_user_id,
    household: row.household,
    notes: row.notes,
    isAdmin: row.is_admin,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// members を SELECT する時の標準カラム指定 (joined_at を含む)。
// 各 lib/route から参照するため export する。
export const MEMBER_COLUMNS =
  "id, member_number, display_name, role, line_user_id, household, notes, is_admin, joined_at, created_at, updated_at";

export function isValidLineUserId(value: unknown): value is string {
  return typeof value === "string" && LINE_USER_ID_PATTERN.test(value);
}

// LIFF userId から member を取得 (サーバー専用)
export async function getMemberByLineUserId(
  lineUserId: string
): Promise<Member | null> {
  if (!supabaseAdmin || !isValidLineUserId(lineUserId)) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("members")
      .select(MEMBER_COLUMNS)
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    if (error || !data) return null;
    return formatMember(data as MemberRow);
  } catch (err) {
    console.error("[auth] getMemberByLineUserId threw", err);
    return null;
  }
}

// API ルート用ヘルパー: 役員かどうかを判定。
// 戻り値: { ok: true, member } 役員 / { ok: false, status, error } それ以外
export type AdminGuardResult =
  | { ok: true; member: Member }
  | { ok: false; status: number; error: string };

export async function requireAdmin(lineUserId: unknown): Promise<AdminGuardResult> {
  if (!isValidLineUserId(lineUserId)) {
    return { ok: false, status: 401, error: "認証が必要です" };
  }
  const member = await getMemberByLineUserId(lineUserId);
  if (!member) {
    return { ok: false, status: 403, error: "会員として登録されていません" };
  }
  if (!member.isAdmin) {
    return { ok: false, status: 403, error: "役員権限が必要です" };
  }
  return { ok: true, member };
}

// 認証状態を判定する。
// - 未登録 (members に紐付けなし) → not_registered
// - 役員 → 即 ok (会費完納未要)
// - 準会員 → 登録済み = コード認証済みなので ok
// - 会員 → 当年度の会費を「月割した期待額」以上 支払っているか確認 → 未納なら unpaid
export async function getAuthStatus(
  lineUserId: unknown
): Promise<ServerAuthStatus> {
  if (!isValidLineUserId(lineUserId)) {
    return { kind: "not_registered" };
  }
  const member = await getMemberByLineUserId(lineUserId);
  if (!member) {
    return { kind: "not_registered" };
  }
  if (member.isAdmin || member.role === "associate") {
    return { kind: "ok", member };
  }
  if (!supabaseAdmin) {
    return { kind: "ok", member };
  }
  const year = currentFiscalYear();
  const [{ data: fees }, { data: payments }] = await Promise.all([
    supabaseAdmin
      .from("fee_schedules")
      .select("amount")
      .eq("fiscal_year", year)
      .eq("role", "member" as MemberRole)
      .maybeSingle(),
    supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("fiscal_year", year)
      .eq("member_id", member.id),
  ]);
  const annual =
    fees && typeof (fees as { amount: number }).amount === "number"
      ? (fees as { amount: number }).amount
      : 0;
  const expected = expectedAmount(annual, year, member.joinedAt);
  const paid = (payments ?? []).reduce(
    (sum, row) => sum + ((row as { amount: number }).amount ?? 0),
    0
  );
  if (expected > 0 && paid < expected) {
    return { kind: "unpaid", member, expected, paid };
  }
  return { kind: "ok", member };
}
