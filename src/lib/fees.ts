import { supabaseAdmin } from "@/lib/supabase-admin";
import type { FeeSchedule, FeeScheduleInput, MemberRole } from "@/types";

const VALID_ROLES: MemberRole[] = ["member", "associate"];

interface FeeRow {
  id: string;
  fiscal_year: number;
  role: MemberRole;
  amount: number;
}

function formatFee(row: FeeRow): FeeSchedule {
  return {
    id: row.id,
    fiscalYear: row.fiscal_year,
    role: row.role,
    amount: row.amount,
  };
}

// 全期間・全種別の会費表
export async function getAllFeeSchedules(): Promise<FeeSchedule[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("fee_schedules")
      .select("id, fiscal_year, role, amount")
      .order("fiscal_year", { ascending: false })
      .order("role", { ascending: true });
    if (error) {
      console.error("[fees] getAllFeeSchedules error", error);
      return [];
    }
    return (data ?? []).map((r) => formatFee(r as FeeRow));
  } catch (err) {
    console.error("[fees] getAllFeeSchedules threw", err);
    return [];
  }
}

// 特定年度の会費表
export async function getFeeSchedulesForYear(
  fiscalYear: number
): Promise<FeeSchedule[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("fee_schedules")
      .select("id, fiscal_year, role, amount")
      .eq("fiscal_year", fiscalYear);
    if (error) {
      console.error("[fees] getFeeSchedulesForYear error", error);
      return [];
    }
    return (data ?? []).map((r) => formatFee(r as FeeRow));
  } catch (err) {
    console.error("[fees] getFeeSchedulesForYear threw", err);
    return [];
  }
}

// 1件追加 / 更新 (UPSERT)
export async function upsertFeeSchedule(
  input: FeeScheduleInput
): Promise<void> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  if (!Number.isInteger(input.fiscalYear) || input.fiscalYear < 2000) {
    throw new Error("年度が不正です");
  }
  if (!VALID_ROLES.includes(input.role)) {
    throw new Error("会員種別が不正です");
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error("金額が不正です");
  }
  const { error } = await supabaseAdmin.from("fee_schedules").upsert(
    {
      fiscal_year: input.fiscalYear,
      role: input.role,
      amount: input.amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fiscal_year,role" }
  );
  if (error) {
    console.error("[fees] upsertFeeSchedule failed", error);
    throw new Error("会費の保存に失敗しました");
  }
}

export async function deleteFeeSchedule(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const { error } = await supabaseAdmin
    .from("fee_schedules")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[fees] deleteFeeSchedule failed", error);
    throw new Error("会費の削除に失敗しました");
  }
}
