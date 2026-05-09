import { NextResponse } from "next/server";
import { getOwnVote } from "@/lib/votes";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 自分の投票 (選択肢) を取得。Server Component では viewer 不明のため
// クライアントから fetch する。
// セキュリティ: line_user_id は本人申告。改ざん可能だが、自分の投票だけ
// 取得する API なので影響は「他人の投票結果を取得できる」ことだが、これは
// 元々 getVoteSummary と同等の情報なので問題ない。
export async function POST(request: Request) {
  let body: { taskId?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { taskId, lineUserId } = body;
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

  const selectedOption = await getOwnVote(taskId, lineUserId);
  return NextResponse.json({ selectedOption });
}
