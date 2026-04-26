import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { softDeleteComment } from "@/lib/comments";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 投稿者本人によるコメントのソフトデリート。
// Supabase の UPDATE を line_user_id で絞って実行するため、他人のコメントは
// そもそも更新対象にならない (0行更新で 403 を返す)。
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "コメントIDが不正です" },
      { status: 400 }
    );
  }

  let body: { lineUserId?: string; taskId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { lineUserId, taskId } = body;
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const updatedCount = await softDeleteComment(id, lineUserId);
    if (updatedCount === 0) {
      return NextResponse.json(
        { error: "削除できませんでした (権限なし、または既に削除済み)" },
        { status: 403 }
      );
    }
    if (taskId && typeof taskId === "string") {
      revalidatePath(`/tasks/${taskId}`);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[comments/delete] failed", err);
    return NextResponse.json(
      { error: "削除に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
