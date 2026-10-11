import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { toggleInterest } from "@/lib/circulation-interests";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 回覧板への「興味あり」トグル。
// body: { circulationId, lineUserId }
// 返り値: { interested: boolean, count: number }
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
    const result = await toggleInterest(circulationId, lineUserId);
    // 一覧 / 詳細の集計表示をリフレッシュ
    revalidatePath("/circulation");
    revalidatePath(`/circulation/${circulationId}`);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[circulation-interests] toggle failed", err);
    return NextResponse.json(
      { error: "興味ありの操作に失敗しました" },
      { status: 500 }
    );
  }
}
