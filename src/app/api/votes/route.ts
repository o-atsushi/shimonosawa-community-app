import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { castVote } from "@/lib/votes";
import { getTask } from "@/lib/tasks";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 投票 / 変更 (UPSERT)。1人1票で何度でも変更可能。
// taskId と selectedOption は microCMS 側の voteOptions に含まれる文字列であることを
// サーバー側で検証してから upsert する。
export async function POST(request: Request) {
  let body: { taskId?: string; lineUserId?: string; selectedOption?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { taskId, lineUserId, selectedOption } = body;

  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json(
      { error: "課題IDが不正です" },
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
  if (
    !selectedOption ||
    typeof selectedOption !== "string" ||
    selectedOption.trim().length === 0 ||
    selectedOption.length > 200
  ) {
    return NextResponse.json(
      { error: "選択肢が不正です" },
      { status: 400 }
    );
  }

  // 課題に紐づく公式の選択肢に含まれるかどうかを検証
  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json(
      { error: "課題が見つかりません" },
      { status: 404 }
    );
  }
  if (!task.voteOptions.includes(selectedOption)) {
    return NextResponse.json(
      { error: "選択肢が一致しません (役員が選択肢を変更した可能性があります)" },
      { status: 400 }
    );
  }

  try {
    await castVote(taskId, lineUserId, selectedOption);
    revalidatePath(`/tasks/${taskId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[votes] castVote failed", err);
    return NextResponse.json(
      { error: "投票に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
