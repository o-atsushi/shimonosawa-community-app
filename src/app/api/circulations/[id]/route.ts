import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteCirculation } from "@/lib/circulations";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 役員のみ。回覧板を削除する (Supabase Storage 上の画像本体はそのまま残る点に注意)。
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "回覧板の削除は役員のみ可能です" },
      { status: 403 }
    );
  }

  try {
    await deleteCirculation(id);
    revalidatePath("/circulation");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[circulations] delete failed", err);
    return NextResponse.json(
      { error: "削除に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
