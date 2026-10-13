import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { togglePaperRequest } from "@/lib/circulation-paper-requests";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 回覧板への「紙配布希望」トグル。
// body: { circulationId, lineUserId }
// 返り値: { requested: boolean, count: number }
export async function POST(request: Request) {
  let body: { circulationId?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const { circulationId, lineUserId } = body;
  if (!circulationId || typeof circulationId !== "string") {
    return NextResponse.json(
      { error: "回覧板 ID が不正です" },
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
    const result = await togglePaperRequest(circulationId, lineUserId);
    // 詳細の集計表示をリフレッシュ (一覧には出していない)
    revalidatePath(`/circulation/${circulationId}`);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[circulation-paper-requests] toggle failed", err);
    return NextResponse.json(
      { error: "紙配布希望の操作に失敗しました" },
      { status: 500 }
    );
  }
}
