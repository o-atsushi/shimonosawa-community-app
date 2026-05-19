import { NextResponse } from "next/server";
import { getAuthStatus } from "@/lib/auth";

// 認証ステータスを返す。
// クライアントは LIFF userId を送り、サーバーが会員台帳と入金状況を
// 突き合わせて kind = ok / unpaid / not_registered のいずれかを返す。
export async function POST(request: Request) {
  let body: { lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const status = await getAuthStatus(body.lineUserId);
  return NextResponse.json(status);
}
