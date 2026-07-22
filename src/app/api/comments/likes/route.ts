import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { toggleLike } from "@/lib/comment-likes";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// コメントへのいいねトグル。
// body: { commentId, lineUserId }
// 返り値: { liked: boolean, count: number }
export async function POST(request: Request) {
  let body: { commentId?: string; lineUserId?: string; taskId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const { commentId, lineUserId, taskId } = body;
  if (!commentId || typeof commentId !== "string") {
    return NextResponse.json(
      { error: "コメントIDが不正です" },
      { status: 400 }
    );
  }
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const result = await toggleLike(commentId, lineUserId);
    // 課題詳細のキャッシュを破棄 (集計値が変わるので)
    if (taskId && typeof taskId === "string") {
      revalidatePath(`/tasks/${taskId}`);
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[comment-likes] toggle failed", err);
    return NextResponse.json(
      { error: "いいねの操作に失敗しました" },
      { status: 500 }
    );
  }
}
