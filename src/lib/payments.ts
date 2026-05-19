import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Payment, PaymentInput } from "@/types";

const PAID_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PaymentRow {
  id: string;
  member_id: string;
  fiscal_year: number;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
  created_at: string;
}

function formatPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    memberId: row.member_id,
    fiscalYear: row.fiscal_year,
    amount: row.amount,
    paidAt: row.paid_at,
    method: row.method,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// 全入金記録 (admin 用 / 期間絞り込みは API 側で)
export async function getAllPayments(): Promise<Payment[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(
        "id, member_id, fiscal_year, amount, paid_at, method, notes, created_at"
      )
      .order("paid_at", { ascending: false });
    if (error) {
      console.error("[payments] getAllPayments error", error);
      return [];
    }
    return (data ?? []).map((r) => formatPayment(r as PaymentRow));
  } catch (err) {
    console.error("[payments] getAllPayments threw", err);
    return [];
  }
}

export async function getPaymentsByMember(
  memberId: string
): Promise<Payment[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(
        "id, member_id, fiscal_year, amount, paid_at, method, notes, created_at"
      )
      .eq("member_id", memberId)
      .order("paid_at", { ascending: false });
    if (error) {
      console.error("[payments] getPaymentsByMember error", error);
      return [];
    }
    return (data ?? []).map((r) => formatPayment(r as PaymentRow));
  } catch (err) {
    console.error("[payments] getPaymentsByMember threw", err);
    return [];
  }
}

function validatePaymentInput(input: PaymentInput): string | null {
  if (!input.memberId || typeof input.memberId !== "string") {
    return "会員が指定されていません";
  }
  if (
    !Number.isInteger(input.fiscalYear) ||
    input.fiscalYear < 2000 ||
    input.fiscalYear > 3000
  ) {
    return "年度が不正です";
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return "金額が不正です";
  }
  if (!input.paidAt || !PAID_AT_PATTERN.test(input.paidAt)) {
    return "入金日 (YYYY-MM-DD) が不正です";
  }
  if (input.method != null && input.method.length > 50) {
    return "入金方法は50文字以内で入力してください";
  }
  if (input.notes != null && input.notes.length > 500) {
    return "備考は500文字以内で入力してください";
  }
  return null;
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const err = validatePaymentInput(input);
  if (err) throw new Error(err);
  const { data, error } = await supabaseAdmin
    .from("payments")
    .insert({
      member_id: input.memberId,
      fiscal_year: input.fiscalYear,
      amount: input.amount,
      paid_at: input.paidAt,
      method: input.method || null,
      notes: input.notes || null,
    })
    .select(
      "id, member_id, fiscal_year, amount, paid_at, method, notes, created_at"
    )
    .single();
  if (error || !data) {
    console.error("[payments] createPayment failed", error);
    throw new Error("入金記録の追加に失敗しました");
  }
  return formatPayment(data as PaymentRow);
}

export async function deletePayment(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error("Supabase admin is not configured");
  const { error } = await supabaseAdmin
    .from("payments")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[payments] deletePayment failed", error);
    throw new Error("入金記録の削除に失敗しました");
  }
}
