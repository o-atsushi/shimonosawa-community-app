import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInquiry } from "@/lib/inquiries";
import type { InquiryCategory, InquiryInput } from "@/types";

const VALID_CATEGORIES: InquiryCategory[] = [
  "operations",
  "event",
  "facility",
  "app",
  "other",
];
// LINE userId は "U" 始まりの33文字(Uプラス32文字の16進数)
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

export async function POST(request: Request) {
  let body: Partial<InquiryInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { category, title, body: text, lineUserId } = body;
  // lineUserId は任意。フォーマットが合わない値は黙って無視する(防御的)
  const safeLineUserId =
    typeof lineUserId === "string" && LINE_USER_ID_PATTERN.test(lineUserId)
      ? lineUserId
      : undefined;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: "カテゴリを選択してください" },
      { status: 400 }
    );
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: "タイトルを入力してください" },
      { status: 400 }
    );
  }
  if (title.length > 50) {
    return NextResponse.json(
      { error: "タイトルは50文字以内で入力してください" },
      { status: 400 }
    );
  }
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "本文を入力してください" },
      { status: 400 }
    );
  }
  if (text.length > 500) {
    return NextResponse.json(
      { error: "本文は500文字以内で入力してください" },
      { status: 400 }
    );
  }

  try {
    const { id } = await createInquiry({
      category,
      title: title.trim(),
      body: text.trim(),
      lineUserId: safeLineUserId,
    });

    // 下書き保存なので一覧に影響はないが、将来公開時に備えて残す
    revalidatePath("/inquiries");
    revalidatePath("/");

    return NextResponse.json(
      {
        id,
        message: "投稿を受け付けました。役員の確認後に公開されます。",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[inquiries] create failed", error);
    return NextResponse.json(
      { error: "送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
