import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInquiry } from "@/lib/inquiries";
import { sanitizeInquiryBody } from "@/lib/sanitize";
import type { InquiryCategory, InquiryInput, InquiryKind } from "@/types";

// 本文は HTML を許容するので長め。タグの分の余裕を見て 5000 文字まで。
const BODY_MAX_HTML = 5000;

const VALID_KINDS: InquiryKind[] = ["question", "request"];
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

  const { kind, category, title, body: text, lineUserId } = body;
  // lineUserId は任意。フォーマットが合わない値は黙って無視する(防御的)
  const safeLineUserId =
    typeof lineUserId === "string" && LINE_USER_ID_PATTERN.test(lineUserId)
      ? lineUserId
      : undefined;

  if (!kind || !VALID_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: "種別 (質問 / 要望) を選択してください" },
      { status: 400 }
    );
  }
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
  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "本文を入力してください" },
      { status: 400 }
    );
  }
  if (text.length > BODY_MAX_HTML) {
    return NextResponse.json(
      { error: "本文が長すぎます。文章量を減らすか画像を整理してください" },
      { status: 400 }
    );
  }

  // 本文はリッチエディタからの HTML。
  // 1) sanitize して安全にする (危険なタグ・属性・許可外画像 src を除去)
  // 2) その後タグを剥いた残量で空判定 (タグだけの空投稿を弾く)
  const cleanBody = sanitizeInquiryBody(text);
  const plainCheck = cleanBody.replace(/<[^>]+>/g, "").trim();
  if (plainCheck.length === 0) {
    return NextResponse.json(
      { error: "本文を入力してください" },
      { status: 400 }
    );
  }

  try {
    const { id } = await createInquiry({
      kind,
      category,
      title: title.trim(),
      body: cleanBody,
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
