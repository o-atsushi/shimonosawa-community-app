import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { setTaskResolution } from "@/lib/tasks";
import { isAdminLineUser } from "@/lib/members";
import { TRUSTED_BODY_SANITIZE } from "@/lib/sanitize";
import type { ResolutionOutcome } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const SUMMARY_MAX = 20000;
const VALID_OUTCOMES: ResolutionOutcome[] = [
  "approved",
  "rejected",
  "deferred",
  "undecided",
];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 役員のみ: 議決結果 (outcome / summary / date) を更新する。
// body: {
//   resolutionOutcome: ResolutionOutcome,
//   resolutionSummary: string (HTML, 空でも可),
//   resolutionDate: string ("YYYY-MM-DD" or 空),
//   lineUserId: string
// }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: {
    resolutionOutcome?: string;
    resolutionSummary?: string;
    resolutionDate?: string;
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
  const { resolutionOutcome, resolutionSummary, resolutionDate, lineUserId } =
    body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "議決結果の更新は役員のみ可能です" },
      { status: 403 }
    );
  }
  if (
    typeof resolutionOutcome !== "string" ||
    !VALID_OUTCOMES.includes(resolutionOutcome as ResolutionOutcome)
  ) {
    return NextResponse.json(
      { error: "議決結果 (可決/否決/保留/未決) を選択してください" },
      { status: 400 }
    );
  }
  const summary = typeof resolutionSummary === "string" ? resolutionSummary : "";
  if (summary.length > SUMMARY_MAX) {
    return NextResponse.json(
      { error: "まとめが長すぎます" },
      { status: 400 }
    );
  }
  const cleanSummary =
    summary.length > 0 ? sanitizeHtml(summary, TRUSTED_BODY_SANITIZE) : "";
  const date =
    typeof resolutionDate === "string" && resolutionDate.length > 0
      ? resolutionDate
      : "";
  if (date.length > 0 && !DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { error: "議決日の形式が不正です (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  try {
    await setTaskResolution(id, {
      resolutionOutcome: resolutionOutcome as ResolutionOutcome,
      resolutionSummary: cleanSummary,
      resolutionDate: date,
    });
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);
    revalidatePath(`/tasks/${id}/resolution`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/tasks/resolution] update failed", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          "議決結果の保存に失敗しました。microCMS の tasks に resolutionOutcome / resolutionSummary / resolutionDate フィールドが追加済みかご確認ください。",
        detail: detail.slice(0, 500),
      },
      { status: 500 }
    );
  }
}
