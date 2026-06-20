import { NextResponse } from "next/server";
import { getOwnVote } from "@/lib/votes";
import { getTask } from "@/lib/tasks";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 自分の回答 (選択肢 / 自由記述 / 理由) を取得。
// 返り値:
//   {
//     selectedOptions: string[],   // single / multiple
//     freeText: string | null,     // freetext モードのみ非 null
//     reason: string | null
//   }
export async function POST(request: Request) {
  let body: { taskId?: string; lineUserId?: string; household?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const { taskId, lineUserId, household } = body;
  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json({ error: "課題IDが不正です" }, { status: 400 });
  }
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  // 世帯名指定があればそれで照会 (家族の誰かが投じた票を全員で見られる)
  const householdKey =
    typeof household === "string" && household.trim().length > 0
      ? household.trim().slice(0, 100)
      : null;

  const task = await getTask(taskId);
  const own = await getOwnVote(taskId, lineUserId, householdKey);
  if (!own) {
    return NextResponse.json({
      selectedOptions: [],
      freeText: null,
      reason: null,
    });
  }
  // freetext モードでは selected_option に本文が入っている → freeText フィールドに差し替えて返す
  if (task?.voteMode === "freetext") {
    return NextResponse.json({
      selectedOptions: [],
      freeText: own.selectedOptions[0] ?? null,
      reason: null,
    });
  }
  return NextResponse.json({
    selectedOptions: own.selectedOptions,
    freeText: null,
    reason: own.reason,
  });
}
