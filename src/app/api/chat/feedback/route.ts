import { NextResponse } from "next/server";
import { setChatFeedback } from "@/lib/chat";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/;

// 回答への 👍 / 👎。本人の回答にだけ付けられる。
// body: { lineUserId, logId, helpful }
export async function POST(request: Request) {
  let body: { lineUserId?: unknown; logId?: unknown; helpful?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }
  const { lineUserId, logId, helpful } = body;
  if (typeof lineUserId !== "string" || !LINE_USER_ID_PATTERN.test(lineUserId)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (typeof logId !== "string" || !UUID_PATTERN.test(logId) || typeof helpful !== "boolean") {
    return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }
  const ok = await setChatFeedback(logId, lineUserId, helpful);
  if (!ok) {
    return NextResponse.json({ error: "評価を保存できませんでした" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
