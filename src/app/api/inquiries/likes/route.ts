import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { toggleLike } from "@/lib/inquiry-likes";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 要望/質問へのいいねトグル。
// body: { inquiryId, lineUserId }
// 返り値: { liked: boolean, count: number }
export async function POST(request: Request) {
  let body: { inquiryId?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { inquiryId, lineUserId } = body;
  if (!inquiryId || typeof inquiryId !== "string") {
    return NextResponse.json(
      { error: "投稿IDが不正です" },
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
    const result = await toggleLike(inquiryId, lineUserId);
    // ホーム / 一覧ページは集計値を表示するので再生成する。
    // 詳細ページは LikeButton 側で即時更新するため revalidate 不要だが、
    // 念のためカードカウントの整合性のため revalidate しておく。
    revalidatePath("/inquiries");
    revalidatePath("/");
    return NextResponse.json(result);
  } catch (err) {
    console.error("[inquiry-likes] toggle failed", err);
    return NextResponse.json(
      { error: "いいねの操作に失敗しました" },
      { status: 500 }
    );
  }
}
