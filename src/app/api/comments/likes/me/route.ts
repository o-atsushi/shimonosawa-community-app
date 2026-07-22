import { NextResponse } from "next/server";
import { getOwnLikedIds } from "@/lib/comment-likes";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 自分がいいね済みのコメント id 一覧を返す (与えられた候補内に絞り込み)。
// body: { lineUserId, commentIds: string[] }
// 返り値: { likedIds: string[] }
export async function POST(request: Request) {
  let body: { lineUserId?: string; commentIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const { lineUserId, commentIds } = body;
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!Array.isArray(commentIds)) {
    return NextResponse.json(
      { error: "対象IDの形式が不正です" },
      { status: 400 }
    );
  }
  const filtered = commentIds.filter(
    (v) => typeof v === "string" && v.length > 0
  );
  if (filtered.length > 500) {
    return NextResponse.json(
      { error: "対象が多すぎます" },
      { status: 400 }
    );
  }

  const likedIds = await getOwnLikedIds(lineUserId, filtered);
  return NextResponse.json({ likedIds });
}
