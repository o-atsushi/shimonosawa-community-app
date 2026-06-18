import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  clearInquiryResponse,
  setInquiryResponse,
} from "@/lib/inquiries";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const BODY_MAX = 2000;
const RESPONDED_BY_MAX = 50;

// 役員のみ: 回答 (responseBody / respondedBy / respondedAt) を保存する。
// body: { responseBody: string, respondedBy: string, lineUserId: string }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: {
    responseBody?: string;
    respondedBy?: string;
    lineUserId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { responseBody, respondedBy, lineUserId } = body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "回答の入力は役員のみ可能です" },
      { status: 403 }
    );
  }
  if (
    typeof responseBody !== "string" ||
    responseBody.trim().length === 0 ||
    responseBody.length > BODY_MAX
  ) {
    return NextResponse.json(
      { error: `回答本文を 1〜${BODY_MAX} 文字で入力してください` },
      { status: 400 }
    );
  }
  if (
    typeof respondedBy !== "string" ||
    respondedBy.trim().length === 0 ||
    respondedBy.length > RESPONDED_BY_MAX
  ) {
    return NextResponse.json(
      { error: `回答者名を 1〜${RESPONDED_BY_MAX} 文字で入力してください` },
      { status: 400 }
    );
  }

  try {
    await setInquiryResponse(id, responseBody.trim(), respondedBy.trim());
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/inquiries/response] save failed", err);
    return NextResponse.json(
      { error: "回答の保存に失敗しました" },
      { status: 500 }
    );
  }
}

// 役員のみ: 回答を取り消す (3 フィールドを空にする)。
// body: { lineUserId: string }
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
      { error: "回答の取り消しは役員のみ可能です" },
      { status: 403 }
    );
  }
  try {
    await clearInquiryResponse(id);
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/inquiries/response] clear failed", err);
    return NextResponse.json(
      { error: "回答の取り消しに失敗しました" },
      { status: 500 }
    );
  }
}
