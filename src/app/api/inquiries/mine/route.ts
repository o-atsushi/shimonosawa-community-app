import { NextResponse } from "next/server";
import { getInquiriesByOwner } from "@/lib/inquiries";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 投稿者本人が自分の投稿を一覧で見るための API。
// body: { lineUserId }
// 返り値: { inquiries: Inquiry[] } (未公開含む、ソフトデリート除外)
export async function POST(request: Request) {
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

  try {
    const inquiries = await getInquiriesByOwner(lineUserId);
    return NextResponse.json({ inquiries });
  } catch (err) {
    console.error("[inquiries/mine] failed", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "自分の投稿の取得に失敗しました",
        detail: detail.slice(0, 500),
      },
      { status: 500 }
    );
  }
}
