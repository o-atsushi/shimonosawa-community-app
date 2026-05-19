import { NextResponse } from "next/server";
import { getOwnLikedIds } from "@/lib/inquiry-likes";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 自分が「いいね済み」の投稿 id 一覧を返す。
// 一覧表示時にクライアントから呼んで、ハートを赤くするかどうか判定する。
// body: { lineUserId, inquiryIds: string[] }
// 返り値: { likedIds: string[] }
export async function POST(request: Request) {
  let body: { lineUserId?: string; inquiryIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { lineUserId, inquiryIds } = body;
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!Array.isArray(inquiryIds)) {
    return NextResponse.json(
      { error: "対象IDの形式が不正です" },
      { status: 400 }
    );
  }
  // 過剰な ID 列挙を弾く
  const filtered = inquiryIds.filter(
    (v) => typeof v === "string" && v.length > 0
  );
  if (filtered.length > 200) {
    return NextResponse.json(
      { error: "対象が多すぎます" },
      { status: 400 }
    );
  }

  const likedIds = await getOwnLikedIds(lineUserId, filtered);
  return NextResponse.json({ likedIds });
}
