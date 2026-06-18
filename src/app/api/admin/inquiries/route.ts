import { NextResponse } from "next/server";
import { getInquiriesForAdmin } from "@/lib/inquiries";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 役員専用: 未公開を含む全ての要望/質問を取得。
// body: { lineUserId }
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
  let admin = false;
  try {
    admin = await isAdminLineUser(lineUserId);
  } catch (err) {
    console.error("[admin/inquiries] isAdminLineUser threw", err);
    return NextResponse.json(
      {
        error:
          "役員判定の取得に失敗しました (Supabase / members テーブルの設定をご確認ください)",
      },
      { status: 500 }
    );
  }
  if (!admin) {
    return NextResponse.json(
      { error: "このページの閲覧権限がありません (役員のみ)" },
      { status: 403 }
    );
  }
  try {
    const inquiries = await getInquiriesForAdmin();
    return NextResponse.json({ inquiries });
  } catch (err) {
    console.error("[admin/inquiries] getInquiriesForAdmin threw", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          "microCMS からの一覧取得に失敗しました。microCMS の inquiries スキーマに `isPublished` (boolean) フィールドを追加済みかご確認ください。",
        detail: detail.slice(0, 500),
      },
      { status: 500 }
    );
  }
}
