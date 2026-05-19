import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteMember, updateMember } from "@/lib/members";
import type { MemberInput, MemberRole } from "@/types";

const VALID_ROLES: MemberRole[] = ["member", "associate"];

// PATCH /api/admin/members/[id]
// body: { lineUserId (役員の), input: MemberInput }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const member = await updateMember(id, {
      displayName: input.displayName,
      role: input.role as MemberRole,
      lineUserId: input.lineUserId ?? null,
      household: input.household ?? null,
      notes: input.notes ?? null,
      isAdmin: input.isAdmin ?? false,
    });
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${id}`);
    return NextResponse.json({ member });
  } catch (err) {
    console.error("[admin/members/:id] PATCH failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "会員の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/members/[id]
// body: { lineUserId (役員の) }
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { lineUserId?: string };
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
  if (guard.member.id === id) {
    return NextResponse.json(
      { error: "自分自身は削除できません" },
      { status: 400 }
    );
  }

  try {
    await deleteMember(id);
    revalidatePath("/admin/members");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/members/:id] DELETE failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "削除に失敗しました" },
      { status: 500 }
    );
  }
}
