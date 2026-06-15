import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setInquiryPublication } from "@/lib/inquiries";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 役員のみ: 要望/質問の公開状態 (isPublished) を切り替える。
// body: { isPublished: boolean, lineUserId: string }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { isPublished?: boolean; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { isPublished, lineUserId } = body;
  if (typeof isPublished !== "boolean") {
    return NextResponse.json(
      { error: "公開状態が不正です" },
      { status: 400 }
    );
  }
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "公開操作は役員のみ可能です" },
      { status: 403 }
    );
  }
  try {
    await setInquiryPublication(id, isPublished);
    // 住民/ホームの一覧キャッシュを破棄
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/inquiries/publication] update failed", err);
    return NextResponse.json(
      { error: "公開状態の更新に失敗しました" },
      { status: 500 }
    );
  }
}
