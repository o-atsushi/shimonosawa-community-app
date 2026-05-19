import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createMember, getAllMembers } from "@/lib/members";
import type { MemberInput, MemberRole } from "@/types";

const VALID_ROLES: MemberRole[] = ["member", "associate"];

// GET /api/admin/members?lineUserId=U***
// 全会員一覧を返す。役員のみ。
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guard = await requireAdmin(searchParams.get("lineUserId"));
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const members = await getAllMembers();
  return NextResponse.json({ members });
}

// POST /api/admin/members
// body: { lineUserId (役員の), input: MemberInput }
export async function POST(request: Request) {
  let body: { lineUserId?: string; input?: Partial<MemberInput> };
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
  if (!input.role || !VALID_ROLES.includes(input.role as MemberRole)) {
    return NextResponse.json(
      { error: "会員種別が不正です" },
      { status: 400 }
    );
  }
  if (!input.displayName || typeof input.displayName !== "string") {
    return NextResponse.json(
      { error: "氏名を入力してください" },
      { status: 400 }
    );
  }

  try {
    const member = await createMember({
      displayName: input.displayName,
      role: input.role as MemberRole,
      lineUserId: input.lineUserId ?? null,
      household: input.household ?? null,
      notes: input.notes ?? null,
      isAdmin: input.isAdmin ?? false,
    });
    revalidatePath("/admin/members");
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    console.error("[admin/members] POST failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "会員の追加に失敗しました" },
      { status: 500 }
    );
  }
}
