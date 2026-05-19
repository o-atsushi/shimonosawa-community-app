import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deletePayment } from "@/lib/payments";

// DELETE /api/admin/payments/[id]
// body: { lineUserId, memberId? (revalidate 用) }
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { lineUserId?: string; memberId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const guard = await requireAdmin(body.lineUserId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    await deletePayment(id);
    if (body.memberId) {
      revalidatePath(`/admin/members/${body.memberId}`);
    }
    revalidatePath("/admin/members");
    revalidatePath("/admin/payments");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/payments/:id] DELETE failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "削除に失敗しました" },
      { status: 500 }
    );
  }
}
