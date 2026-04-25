import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createComment } from "@/lib/comments";
import type { CommentInput } from "@/types";

// LINE userId のフォーマット (U + 32文字の16進数)
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
// microCMS のコンテンツID は半角英数字とハイフン・アンダースコアまで許容される想定
const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const BODY_MIN = 1;
const BODY_MAX = 1000;

export async function POST(request: Request) {
  let body: Partial<CommentInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { taskId, body: text, lineUserId } = body;

  if (
    !taskId ||
    typeof taskId !== "string" ||
    !TASK_ID_PATTERN.test(taskId)
  ) {
    return NextResponse.json(
      { error: "課題IDが不正です" },
      { status: 400 }
    );
  }
  if (!text || typeof text !== "string" || text.trim().length < BODY_MIN) {
    return NextResponse.json(
      { error: "コメントを入力してください" },
      { status: 400 }
    );
  }
  if (text.length > BODY_MAX) {
    return NextResponse.json(
      { error: `コメントは${BODY_MAX}文字以内で入力してください` },
      { status: 400 }
    );
  }
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json(
      { error: "LINEログインが必要です" },
      { status: 401 }
    );
  }

  try {
    const { id } = await createComment({
      taskId,
      body: text.trim(),
      lineUserId,
    });

    revalidatePath(`/tasks/${taskId}`);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[comments] create failed", error);
    return NextResponse.json(
      { error: "送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
