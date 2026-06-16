import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_KIND_LABELS,
  createInquiry,
} from "@/lib/inquiries";
import { pushTextToGroup } from "@/lib/line-messaging";
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
    const trimmedTitle = title.trim();
    const { id } = await createInquiry({
      kind,
      category,
      title: trimmedTitle,
      body: cleanBody,
      lineUserId: safeLineUserId,
    });

    // 新規投稿は isPublished=false なので住民の一覧には出ないが、
    // /admin/inquiries 側のキャッシュを破棄して役員にすぐ見えるようにする
    revalidatePath("/inquiries");
    revalidatePath("/");

    // 役員グループに LINE で通知 (fire-and-forget)。
    // 失敗してもインクワイアリ作成は成功扱いのまま。env 未設定なら何もしない。
    void notifyAdminGroup({
      kind,
      category,
      title: trimmedTitle,
    }).catch((err) => {
      console.warn("[inquiries] LINE notification failed", err);
    });

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

// 役員グループへの通知メッセージを組み立てて Push API を叩く。
// LINE_MESSAGING_CHANNEL_ACCESS_TOKEN / LINE_MODERATION_GROUP_ID が
// 未設定なら何もしない (pushTextToGroup 内でガード)。
async function notifyAdminGroup(params: {
  kind: InquiryKind;
  category: InquiryCategory;
  title: string;
}): Promise<void> {
  const kindLabel = INQUIRY_KIND_LABELS[params.kind];
  const categoryLabel = INQUIRY_CATEGORY_LABELS[params.category];
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
  const adminUrl = liffId
    ? `https://liff.line.me/${liffId}/admin/inquiries`
    : "";
  const lines = [
    `📨 新規${kindLabel}が投稿されました (公開待ち)`,
    "",
    `[${categoryLabel}] ${params.title}`,
  ];
  if (adminUrl) {
    lines.push("", "確認・公開はこちら:", adminUrl);
  }
  await pushTextToGroup(lines.join("\n"));
}
