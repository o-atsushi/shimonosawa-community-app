import { NextResponse } from "next/server";
import {
  CHAT_DAILY_LIMIT,
  CHAT_GLOBAL_DAILY_LIMIT,
  CHAT_MAX_HISTORY_TURNS,
  CHAT_MAX_QUESTION_LENGTH,
  canRetryLog,
  countTodayQuestions,
  generateAnswer,
  insertChatLog,
  isChatConfigured,
  type ChatTurn,
} from "@/lib/chat";
import { getMemberByLineUserId } from "@/lib/members";

// AI の回答生成は数秒〜数十秒かかる
export const maxDuration = 60;

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const SESSION_ID_PATTERN = /^[0-9a-zA-Z-]{8,64}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/;

// body: { lineUserId, sessionId, question, history: [{ role, content }], retryOf?: logId }
// retryOf を付けると「詳しい AI で答え直す」(上位モデルで回答)。
export async function POST(request: Request) {
  if (!isChatConfigured()) {
    return NextResponse.json(
      { error: "AI相談はまだ準備中です。" },
      { status: 503 }
    );
  }

  let body: {
    lineUserId?: unknown;
    sessionId?: unknown;
    question?: unknown;
    history?: unknown;
    retryOf?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }

  const { lineUserId, sessionId } = body;
  if (typeof lineUserId !== "string" || !LINE_USER_ID_PATTERN.test(lineUserId)) {
    return NextResponse.json({ error: "LINE からアプリを開いてご利用ください" }, { status: 401 });
  }
  if (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) {
    return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "質問を入力してください" }, { status: 400 });
  }
  if (question.length > CHAT_MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `質問は ${CHAT_MAX_QUESTION_LENGTH} 文字以内でお願いします` },
      { status: 400 }
    );
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (t): t is ChatTurn =>
            !!t &&
            typeof t === "object" &&
            (t.role === "user" || t.role === "assistant") &&
            typeof t.content === "string"
        )
        .slice(-CHAT_MAX_HISTORY_TURNS)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }))
    : [];
  // API は user から始まる必要がある
  while (history.length > 0 && history[0].role !== "user") history.shift();

  // LINE からアプリを開いた会員だけが使える (members に自動登録された人)
  if (!(await getMemberByLineUserId(lineUserId))) {
    return NextResponse.json({ error: "LINE からアプリを開いてご利用ください" }, { status: 403 });
  }

  let retryOf: string | null = null;
  if (body.retryOf !== undefined && body.retryOf !== null) {
    if (typeof body.retryOf !== "string" || !UUID_PATTERN.test(body.retryOf)) {
      return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
    }
    if (!(await canRetryLog(body.retryOf, lineUserId))) {
      return NextResponse.json({ error: "この回答は答え直しできません" }, { status: 400 });
    }
    retryOf = body.retryOf;
  }

  const [used, usedAll] = await Promise.all([
    countTodayQuestions(lineUserId),
    countTodayQuestions(),
  ]);
  // 件数を数えられない時は費用を守るため受け付けない
  if (used === null || usedAll === null) {
    return NextResponse.json(
      { error: "ただいま混み合っています。時間をおいてもう一度お試しください。" },
      { status: 503 }
    );
  }
  if (used >= CHAT_DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `AI相談は 1 日 ${CHAT_DAILY_LIMIT} 回までです。明日またご利用いただくか、「役員に相談する」からご連絡ください。`,
      },
      { status: 429 }
    );
  }
  if (usedAll >= CHAT_GLOBAL_DAILY_LIMIT) {
    console.warn("[api/chat] global daily limit reached", usedAll);
    return NextResponse.json(
      {
        error:
          "本日は AI相談の受付数が上限に達しました。明日またご利用いただくか、「役員に相談する」からご連絡ください。",
      },
      { status: 429 }
    );
  }

  try {
    const result = await generateAnswer(history, question, retryOf ? "detailed" : "normal");
    const logId = await insertChatLog({ lineUserId, sessionId, question, result, parentLogId: retryOf });
    return NextResponse.json({
      answer: result.answer,
      answerable: result.answerable,
      logId,
      canRetryDetailed: result.canRetryDetailed && !!logId,
      remaining: Math.max(0, CHAT_DAILY_LIMIT - used - 1),
    });
  } catch (err) {
    console.error("[api/chat] generateAnswer failed", err);
    return NextResponse.json(
      { error: "回答の作成に失敗しました。時間をおいてもう一度お試しください。" },
      { status: 500 }
    );
  }
}
