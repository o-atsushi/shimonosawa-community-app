import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteAccessCode } from "@/lib/access-codes";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  try {
    await deleteAccessCode(id);
    revalidatePath("/admin/access-codes");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/access-codes/:id] DELETE failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "削除に失敗しました" },
      { status: 500 }
    );
  }
}
