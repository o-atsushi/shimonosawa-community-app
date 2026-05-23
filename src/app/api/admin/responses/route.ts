import { NextResponse } from "next/server";
import { isAdminLineUser } from "@/lib/members";
import { getTask } from "@/lib/tasks";
import { getResponsesByTask } from "@/lib/votes";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 役員向け: ある課題の各回答者一覧を取得する。
// body: { taskId, lineUserId (= viewerのlineUserId) }
// 役員 (members.is_admin = true) のみ取得可能。
export async function POST(request: Request) {
  let body: { taskId?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { taskId, lineUserId } = body;
  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json({ error: "課題IDが不正です" }, { status: 400 });
  }
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const allowed = await isAdminLineUser(lineUserId);
  if (!allowed) {
    return NextResponse.json(
      { error: "このページの閲覧権限がありません (役員のみ)" },
      { status: 403 }
    );
  }
  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 });
  }
  const responses = await getResponsesByTask(taskId, task.voteMode);
  return NextResponse.json({
    task: {
      id: task.id,
      title: task.title,
      voteMode: task.voteMode,
      voteOptions: task.voteOptions,
      voteDeadline: task.voteDeadline,
    },
    responses,
  });
}
