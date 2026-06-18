import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminLineUser } from "@/lib/members";
import sanitizeHtml from "sanitize-html";
import { createTask } from "@/lib/tasks";
import type { TaskInput } from "@/lib/tasks";
import { TRUSTED_BODY_SANITIZE } from "@/lib/sanitize";
import type { TaskPriority, TaskStatus, VoteMode } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const TITLE_MAX = 100;
const BODY_MAX_HTML = 20000;
const VOTE_OPTIONS_MAX = 1000;

const VALID_STATUS: TaskStatus[] = ["open", "in_progress", "resolved"];
const VALID_PRIORITY: TaskPriority[] = ["high", "medium", "low"];
const VALID_VOTE_MODE: VoteMode[] = ["single", "multiple", "freetext"];

// 役員のみ。新規課題を microCMS の tasks エンドポイントに作成する。
// body: { input: TaskInput, lineUserId: string }
export async function POST(request: Request) {
  let body: { input?: Partial<TaskInput>; lineUserId?: string };
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
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "課題の作成は役員のみ可能です" },
      { status: 403 }
    );
  }
  const validated = validateInput(input);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const { id } = await createTask(validated.input);
    revalidatePath("/tasks");
    revalidatePath("/");
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[admin/tasks] create failed", err);
    return NextResponse.json(
      { error: "課題の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export function validateInput(
  raw: Partial<TaskInput> | undefined
): { input: TaskInput } | { error: string } {
  if (!raw) return { error: "入力が空です" };
  const { title, body, status, priority, displayOrder, voteOptionsRaw, voteDeadline, voteMode } = raw;

  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "タイトルを入力してください" };
  }
  if (title.length > TITLE_MAX) {
    return { error: `タイトルは${TITLE_MAX}文字以内で入力してください` };
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return { error: "本文を入力してください" };
  }
  if (body.length > BODY_MAX_HTML) {
    return { error: "本文が長すぎます" };
  }
  if (
    typeof status !== "string" ||
    !VALID_STATUS.includes(status as TaskStatus)
  ) {
    return { error: "ステータスが不正です" };
  }
  if (
    priority !== undefined &&
    priority !== null &&
    !VALID_PRIORITY.includes(priority as TaskPriority)
  ) {
    return { error: "優先度が不正です" };
  }
  let normalizedOrder: number | undefined;
  if (displayOrder !== undefined && displayOrder !== null) {
    const n =
      typeof displayOrder === "number"
        ? displayOrder
        : Number.parseInt(String(displayOrder), 10);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      return { error: "表示順は 0 以上の整数で入力してください" };
    }
    normalizedOrder = n;
  }
  if (
    voteOptionsRaw !== undefined &&
    voteOptionsRaw !== null &&
    (typeof voteOptionsRaw !== "string" ||
      voteOptionsRaw.length > VOTE_OPTIONS_MAX)
  ) {
    return { error: "投票選択肢の形式が不正です" };
  }
  if (
    voteDeadline !== undefined &&
    voteDeadline !== null &&
    voteDeadline !== "" &&
    typeof voteDeadline === "string"
  ) {
    const d = new Date(voteDeadline);
    if (Number.isNaN(d.getTime())) {
      return { error: "投票期限の日付形式が不正です" };
    }
  }
  if (
    voteMode !== undefined &&
    voteMode !== null &&
    !VALID_VOTE_MODE.includes(voteMode as VoteMode)
  ) {
    return { error: "回答方式が不正です" };
  }

  // body は admin が書く前提で TRUSTED_BODY_SANITIZE を通す (XSS 多層防御)
  const cleanBody = sanitizeHtml(body, TRUSTED_BODY_SANITIZE);
  if (cleanBody.replace(/<[^>]+>/g, "").trim().length === 0) {
    return { error: "本文を入力してください" };
  }

  return {
    input: {
      title: title.trim(),
      body: cleanBody,
      status: status as TaskStatus,
      priority: priority ? (priority as TaskPriority) : undefined,
      displayOrder: normalizedOrder,
      voteOptionsRaw:
        voteOptionsRaw && (voteOptionsRaw as string).trim().length > 0
          ? (voteOptionsRaw as string)
          : undefined,
      voteDeadline:
        voteDeadline && voteDeadline !== "" ? (voteDeadline as string) : undefined,
      voteMode: voteMode ? (voteMode as VoteMode) : undefined,
    },
  };
}
