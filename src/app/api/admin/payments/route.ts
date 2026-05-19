import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createPayment, getAllPayments } from "@/lib/payments";

// GET /api/admin/payments?lineUserId=U***
// 全入金記録を返す (役員のみ)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guard = await requireAdmin(searchParams.get("lineUserId"));
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const payments = await getAllPayments();
  return NextResponse.json({ payments });
}

// POST /api/admin/payments
// body: { lineUserId, input: PaymentInput }
export async function POST(request: Request) {
  let body: {
    lineUserId?: string;
    input?: {
      memberId?: string;
      fiscalYear?: number;
      amount?: number;
      paidAt?: string;
      method?: string | null;
      notes?: string | null;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const guard = await requireAdmin(body.lineUserId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const input = body.input ?? {};
  if (!input.memberId) {
    return NextResponse.json(
      { error: "会員IDが指定されていません" },
      { status: 400 }
    );
  }
  if (
    typeof input.fiscalYear !== "number" ||
    typeof input.amount !== "number" ||
    typeof input.paidAt !== "string"
  ) {
    return NextResponse.json(
      { error: "入力値が不正です" },
      { status: 400 }
    );
  }

  try {
    const payment = await createPayment({
      memberId: input.memberId,
      fiscalYear: input.fiscalYear,
      amount: input.amount,
      paidAt: input.paidAt,
      method: input.method ?? null,
      notes: input.notes ?? null,
    });
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${input.memberId}`);
    revalidatePath("/admin/payments");
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    console.error("[admin/payments] POST failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "登録に失敗しました" },
      { status: 500 }
    );
  }
}
