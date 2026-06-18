import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setInquiryStatus } from "@/lib/inquiries";
import { isAdminLineUser } from "@/lib/members";
import type { InquiryStatus } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const VALID_STATUS: InquiryStatus[] = ["pending", "in_progress", "answered"];

// 役員のみ: 要望/質問のステータスを変更する。
// body: { status: InquiryStatus, lineUserId: string }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { status?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { status, lineUserId } = body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "ステータス変更は役員のみ可能です" },
      { status: 403 }
    );
  }
  if (
    typeof status !== "string" ||
    !VALID_STATUS.includes(status as InquiryStatus)
  ) {
    return NextResponse.json({ error: "ステータスが不正です" }, { status: 400 });
  }

  try {
    await setInquiryStatus(id, status as InquiryStatus);
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/inquiries/status] update failed", err);
    return NextResponse.json(
      { error: "ステータスの更新に失敗しました" },
      { status: 500 }
    );
  }
}
