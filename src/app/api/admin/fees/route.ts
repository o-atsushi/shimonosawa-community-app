import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  upsertFeeSchedule,
  deleteFeeSchedule,
  getAllFeeSchedules,
} from "@/lib/fees";
import type { MemberRole } from "@/types";

const VALID_ROLES: MemberRole[] = ["member", "associate"];

// GET /api/admin/fees?lineUserId=U***
// 全年度・全種別の会費表を返す (役員のみ)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guard = await requireAdmin(searchParams.get("lineUserId"));
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const fees = await getAllFeeSchedules();
  return NextResponse.json({ fees });
}

// PUT /api/admin/fees (UPSERT 1件)
// body: { lineUserId, input: FeeScheduleInput }
export async function PUT(request: Request) {
  let body: {
    lineUserId?: string;
    input?: { fiscalYear?: number; role?: string; amount?: number };
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
  if (typeof input.fiscalYear !== "number" || typeof input.amount !== "number") {
    return NextResponse.json(
      { error: "年度・金額が不正です" },
      { status: 400 }
    );
  }
  if (!input.role || !VALID_ROLES.includes(input.role as MemberRole)) {
    return NextResponse.json(
      { error: "会員種別が不正です" },
      { status: 400 }
    );
  }

  try {
    await upsertFeeSchedule({
      fiscalYear: input.fiscalYear,
      role: input.role as MemberRole,
      amount: input.amount,
    });
    revalidatePath("/admin/fees");
    revalidatePath("/admin/members");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/fees] PUT failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/fees?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  let body: { lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const guard = await requireAdmin(body.lineUserId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  if (!id) {
    return NextResponse.json({ error: "ID が指定されていません" }, { status: 400 });
  }

  try {
    await deleteFeeSchedule(id);
    revalidatePath("/admin/fees");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/fees] DELETE failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "削除に失敗しました" },
      { status: 500 }
    );
  }
}
