import { NextResponse } from "next/server";
import { getOwnInterestedIds } from "@/lib/circulation-interests";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 自分が「興味あり」した回覧板 id を、与えられた候補内から返す。
// body: { lineUserId, circulationIds: string[] }
// 返り値: { interestedIds: string[] }
export async function POST(request: Request) {
  let body: { lineUserId?: string; circulationIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const { lineUserId, circulationIds } = body;
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!Array.isArray(circulationIds)) {
    return NextResponse.json(
      { error: "対象IDの形式が不正です" },
      { status: 400 }
    );
  }
  const filtered = circulationIds.filter(
    (v) => typeof v === "string" && v.length > 0
  );
  if (filtered.length > 500) {
    return NextResponse.json({ error: "対象が多すぎます" }, { status: 400 });
  }

  const interestedIds = await getOwnInterestedIds(lineUserId, filtered);
  return NextResponse.json({ interestedIds });
}
