import { NextResponse } from "next/server";
import {
  getMemberByLineUserId,
  upsertMemberOnLogin,
} from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// LIFF 初回アクセス時に呼ばれる自動登録 + 自分の会員情報取得。
// body: { lineUserId, displayName? }
// 返り値: { member: { id, lineUserId, displayName, isAdmin, ... } | null }
//
// 既登録ならその行を返す (display_name は上書きしない)。
// 未登録なら insert して新行を返す。
export async function POST(request: Request) {
  let body: { lineUserId?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { lineUserId, displayName } = body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const name =
    typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim()
      : "住民";
  const member = await upsertMemberOnLogin(lineUserId, name);
  return NextResponse.json({ member });
}

// GET /api/members/me?lineUserId=...
// クライアントがすでに登録済みであることを前提に、自分の会員情報だけを取得したい時に使う。
// 自動登録はしない。
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lineUserId = searchParams.get("lineUserId");
  if (!lineUserId || !LINE_USER_ID_PATTERN.test(lineUserId)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const member = await getMemberByLineUserId(lineUserId);
  return NextResponse.json({ member });
}
