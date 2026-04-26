import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getInquiryLineUserId,
  softDeleteInquiry,
} from "@/lib/inquiries";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 投稿者本人によるソフトデリート。
// クライアントから lineUserId を送り、サーバー側で対象投稿の lineUserId と
// 一致するか確認してから microCMS の isDeleted を true にする。
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
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { lineUserId } = body;
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let ownerLineUserId: string | undefined;
  try {
    ownerLineUserId = await getInquiryLineUserId(id);
  } catch (err) {
    console.error("[inquiries/delete] fetch owner failed", err);
    return NextResponse.json(
      { error: "投稿の取得に失敗しました" },
      { status: 500 }
    );
  }

  if (!ownerLineUserId) {
    return NextResponse.json(
      { error: "投稿が見つかりません" },
      { status: 404 }
    );
  }
  if (ownerLineUserId !== lineUserId) {
    return NextResponse.json(
      { error: "この投稿を削除する権限がありません" },
      { status: 403 }
    );
  }

  try {
    await softDeleteInquiry(id);
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[inquiries/delete] softDelete failed", err);
    return NextResponse.json(
      { error: "削除に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
