import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getInquiry,
  getInquiryLineUserId,
  softDeleteInquiry,
  updateOwnInquiry,
} from "@/lib/inquiries";
import { sanitizeInquiryBody } from "@/lib/sanitize";
import type { InquiryCategory, InquiryInput, InquiryKind } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const TITLE_MAX = 50;
const BODY_MAX_HTML = 5000;
const VALID_KINDS: InquiryKind[] = ["question", "request"];
const VALID_CATEGORIES: InquiryCategory[] = [
  "operations",
  "event",
  "facility",
  "app",
  "other",
];

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

// 投稿者本人による編集 (未公開時のみ)。
// body: { input: { kind, category, title, body }, lineUserId }
// - 所有権チェック: lineUserId が一致しない投稿は編集不可
// - 未公開チェック: 既に公開済みの投稿は編集不可 (公開後は内容固定)
// - body は HTML として sanitize し直す
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { input?: Partial<InquiryInput>; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }

  const { input, lineUserId } = body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!input) {
    return NextResponse.json({ error: "入力が空です" }, { status: 400 });
  }

  // 所有権 + 未公開チェック
  let target;
  try {
    target = await getInquiry(id);
  } catch (err) {
    console.error("[inquiries/edit] fetch inquiry failed", err);
    return NextResponse.json(
      { error: "投稿の取得に失敗しました" },
      { status: 500 }
    );
  }
  if (!target) {
    return NextResponse.json(
      { error: "投稿が見つかりません" },
      { status: 404 }
    );
  }
  if (target.lineUserId !== lineUserId) {
    return NextResponse.json(
      { error: "この投稿を編集する権限がありません" },
      { status: 403 }
    );
  }
  if (target.isPublished) {
    return NextResponse.json(
      {
        error:
          "公開済みの投稿は編集できません (内容を変えたい場合は一度削除して再投稿してください)",
      },
      { status: 403 }
    );
  }

  // 入力バリデーション (POST と同じ条件)
  const { kind, category, title, body: text } = input;
  if (!kind || !VALID_KINDS.includes(kind as InquiryKind)) {
    return NextResponse.json(
      { error: "種別 (質問 / 要望) を選択してください" },
      { status: 400 }
    );
  }
  if (
    !category ||
    !VALID_CATEGORIES.includes(category as InquiryCategory)
  ) {
    return NextResponse.json(
      { error: "カテゴリを選択してください" },
      { status: 400 }
    );
  }
  if (
    !title ||
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.length > TITLE_MAX
  ) {
    return NextResponse.json(
      { error: `タイトルを 1〜${TITLE_MAX} 文字で入力してください` },
      { status: 400 }
    );
  }
  if (!text || typeof text !== "string" || text.length > BODY_MAX_HTML) {
    return NextResponse.json(
      { error: "本文が空または長すぎます" },
      { status: 400 }
    );
  }
  const cleanBody = sanitizeInquiryBody(text);
  if (cleanBody.replace(/<[^>]+>/g, "").trim().length === 0) {
    return NextResponse.json(
      { error: "本文を入力してください" },
      { status: 400 }
    );
  }

  try {
    await updateOwnInquiry(id, {
      kind: kind as InquiryKind,
      category: category as InquiryCategory,
      title: title.trim(),
      body: cleanBody,
    });
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[inquiries/edit] update failed", err);
    return NextResponse.json(
      { error: "更新に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
