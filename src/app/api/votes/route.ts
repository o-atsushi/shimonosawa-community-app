import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { castVote, withdrawVote } from "@/lib/votes";
import { getTask, isVoteClosed, requiresReason } from "@/lib/tasks";
import type { VoteMode } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const REASON_MAX = 200;
const FREETEXT_MAX = 1000;

// 投票 / 変更。3 モード共通エンドポイント。
// body: {
//   taskId, lineUserId,
//   selectedOptions?: string[],  // single / multiple
//   freeText?: string,           // freetext
//   reason?: string,             // single モードの理由
// }
// サーバー側で task.voteMode を取得し、それに合わせて入力を検証する。
export async function POST(request: Request) {
  let body: {
    taskId?: string;
    lineUserId?: string;
    selectedOptions?: string[];
    freeText?: string;
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { taskId, lineUserId, selectedOptions, freeText, reason } = body;

  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json({ error: "課題IDが不正です" }, { status: 400 });
  }
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 課題情報を取り、モード別バリデーション
  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 });
  }
  if (isVoteClosed(task.voteDeadline)) {
    return NextResponse.json({ error: "投票期限を過ぎました" }, { status: 403 });
  }
  const mode: VoteMode = task.voteMode;

  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  if (trimmedReason.length > REASON_MAX) {
    return NextResponse.json(
      { error: `理由は${REASON_MAX}文字以内で入力してください` },
      { status: 400 }
    );
  }

  let normalizedOptions: string[] = [];
  let normalizedFreeText: string | null = null;

  if (mode === "freetext") {
    if (typeof freeText !== "string") {
      return NextResponse.json(
        { error: "回答を入力してください" },
        { status: 400 }
      );
    }
    const t = freeText.trim();
    if (t.length === 0) {
      return NextResponse.json(
        { error: "回答を入力してください" },
        { status: 400 }
      );
    }
    if (t.length > FREETEXT_MAX) {
      return NextResponse.json(
        { error: `回答は${FREETEXT_MAX}文字以内で入力してください` },
        { status: 400 }
      );
    }
    normalizedFreeText = t;
  } else {
    if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return NextResponse.json(
        { error: "選択肢を選んでください" },
        { status: 400 }
      );
    }
    if (mode === "single" && selectedOptions.length !== 1) {
      return NextResponse.json(
        { error: "選択肢を 1 つ選んでください" },
        { status: 400 }
      );
    }
    // 重複除去
    const uniq = Array.from(new Set(selectedOptions));
    // 全選択肢が task.voteOptions に含まれるか
    for (const opt of uniq) {
      if (typeof opt !== "string" || !task.voteOptions.includes(opt)) {
        return NextResponse.json(
          {
            error:
              "選択肢が一致しません (役員が選択肢を変更した可能性があります)",
          },
          { status: 400 }
        );
      }
    }
    normalizedOptions = uniq;

    // 「反対」を含む選択肢が混ざっていれば理由必須 (single のみ。multiple は理由なし運用)
    if (mode === "single") {
      const need = normalizedOptions.some((o) => requiresReason(o));
      if (need && trimmedReason.length === 0) {
        return NextResponse.json(
          { error: "反対の場合は理由を入力してください" },
          { status: 400 }
        );
      }
    }
  }

  try {
    await castVote(
      taskId,
      lineUserId,
      mode,
      normalizedOptions,
      normalizedFreeText,
      mode === "single" && trimmedReason.length > 0 ? trimmedReason : null
    );
    revalidatePath(`/tasks/${taskId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[votes] castVote failed", err);
    return NextResponse.json(
      { error: "投票に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}

// 自分の投票を取り消す (取り下げ)。
// body: { taskId, lineUserId }
// 期限切れの場合は受け付けない。
export async function DELETE(request: Request) {
  let body: { taskId?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const { taskId, lineUserId } = body;
  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json({ error: "課題IDが不正です" }, { status: 400 });
  }
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  // 期限切れの取り消しも禁止 (集計を後から動かさないため)
  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 });
  }
  if (isVoteClosed(task.voteDeadline)) {
    return NextResponse.json(
      { error: "回答期限を過ぎたため取り消しできません" },
      { status: 403 }
    );
  }

  try {
    await withdrawVote(taskId, lineUserId);
    revalidatePath(`/tasks/${taskId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[votes] withdrawVote failed", err);
    return NextResponse.json(
      { error: "取り消しに失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
