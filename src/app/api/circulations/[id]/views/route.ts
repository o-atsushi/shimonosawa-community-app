import { NextResponse } from "next/server";
import { recordView } from "@/lib/circulation-views";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 詳細ページ表示時にクライアントから 1 行記録する。
// body: { lineUserId }
// 失敗しても致命的ではないため、エラー時も 200 を返す (ログだけ残す)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { lineUserId } = body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  await recordView(id, lineUserId);
  return NextResponse.json({ ok: true });
}
