import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInquiry } from "@/lib/inquiries";
import type { InquiryCategory, InquiryInput } from "@/types";

const VALID_CATEGORIES: InquiryCategory[] = ["request", "question", "other"];

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

  const { category, title, body: text } = body;

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

  const created = await createInquiry({
    category,
    title: title.trim(),
    body: text.trim(),
  });

  revalidatePath("/inquiries");
  revalidatePath("/");

  return NextResponse.json({ inquiry: created }, { status: 201 });
}
