import { NextResponse } from "next/server";
import { getOwnRsvp } from "@/lib/rsvps";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 自分の参加表明を取得 (Server Component から viewer 不明のためクライアント別途取得)
export async function POST(request: Request) {
  let body: { articleId?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { articleId, lineUserId } = body;
  if (!articleId || typeof articleId !== "string") {
    return NextResponse.json(
      { error: "記事IDが不正です" },
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

  const own = await getOwnRsvp(articleId, lineUserId);
  return NextResponse.json({
    response: own?.response ?? null,
    altDate: own?.altDate ?? null,
    note: own?.note ?? null,
  });
}
