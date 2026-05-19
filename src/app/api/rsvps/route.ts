import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { castRsvp } from "@/lib/rsvps";
import type { RsvpResponse } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const VALID_RESPONSES: RsvpResponse[] = ["attending", "skipping", "alt_done"];
const ALT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const NOTE_MAX = 500;

// 清掃活動の参加表明 (UPSERT)
// body: { articleId, lineUserId, response, altDate?, note? }
export async function POST(request: Request) {
  let body: {
    articleId?: string;
    lineUserId?: string;
    response?: string;
    altDate?: string | null;
    note?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { articleId, lineUserId, response, altDate, note } = body;

  if (!articleId || typeof articleId !== "string") {
    return NextResponse.json(
      { error: "記事IDが不正です" },
      { status: 400 }
    );
  }
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (
    !response ||
    typeof response !== "string" ||
    !VALID_RESPONSES.includes(response as RsvpResponse)
  ) {
    return NextResponse.json({ error: "回答が不正です" }, { status: 400 });
  }

  // altDate は skipping / alt_done の時のみ意味がある。フォーマット検証。
  let normalizedAltDate: string | null = null;
  if (altDate != null) {
    if (typeof altDate !== "string" || !ALT_DATE_PATTERN.test(altDate)) {
      return NextResponse.json(
        { error: "日付の形式が不正です (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    normalizedAltDate = altDate;
  }

  let normalizedNote: string | null = null;
  if (note != null) {
    if (typeof note !== "string") {
      return NextResponse.json(
        { error: "備考の形式が不正です" },
        { status: 400 }
      );
    }
    const trimmed = note.trim();
    if (trimmed.length > NOTE_MAX) {
      return NextResponse.json(
        { error: `備考は${NOTE_MAX}文字以内で入力してください` },
        { status: 400 }
      );
    }
    normalizedNote = trimmed.length > 0 ? trimmed : null;
  }

  // 参加 (attending) の場合は altDate / note を保存しない方針 (誤入力防止)
  if ((response as RsvpResponse) === "attending") {
    normalizedAltDate = null;
    normalizedNote = null;
  }

  try {
    await castRsvp(
      articleId,
      lineUserId,
      response as RsvpResponse,
      normalizedAltDate,
      normalizedNote
    );
    revalidatePath(`/events/${articleId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[rsvps] castRsvp failed", err);
    return NextResponse.json(
      { error: "回答に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
