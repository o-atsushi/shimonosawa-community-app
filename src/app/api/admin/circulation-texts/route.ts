import { NextResponse } from "next/server";
import {
  getCirculationTextsForAdmin,
  isCirculationTextConfigured,
  transcribePendingCirculations,
} from "@/lib/circulation-texts";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const maxDuration = 60;
// 1 回の呼び出しで新しい回覧板の処理を始めてよい時間 (残りは画面側が繰り返し呼んで続ける)
const TIME_BUDGET_MS = 25 * 1000;

// 役員専用: 回覧板の文字起こし (AI相談の資料) の確認・実行。
// body: { lineUserId, action: "list" | "run", circulationId? }
//   list: 回覧板ごとの文字起こし状況と本文
//   run:  未処理・失敗の回覧板を文字起こしする (circulationId 指定時はその 1 件をやり直す)
export async function POST(request: Request) {
  let body: { lineUserId?: unknown; action?: unknown; circulationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }
  const { lineUserId, action, circulationId } = body;
  if (typeof lineUserId !== "string" || !LINE_USER_ID_PATTERN.test(lineUserId)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!(await isAdminLineUser(lineUserId))) {
    return NextResponse.json({ error: "このページの閲覧権限がありません (役員のみ)" }, { status: 403 });
  }
  if (!isCirculationTextConfigured()) {
    return NextResponse.json(
      { error: "AI の設定 (ANTHROPIC_API_KEY と SUPABASE_SERVICE_ROLE_KEY) がこの環境にありません" },
      { status: 503 }
    );
  }

  try {
    if (action === "run") {
      if (circulationId !== undefined && (typeof circulationId !== "string" || !UUID_PATTERN.test(circulationId))) {
        return NextResponse.json({ error: "回覧板の指定が不正です" }, { status: 400 });
      }
      const result = await transcribePendingCirculations({
        circulationId: circulationId as string | undefined,
        timeBudgetMs: TIME_BUDGET_MS,
      });
      return NextResponse.json(result);
    }
    const items = await getCirculationTextsForAdmin();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[admin/circulation-texts] failed", err);
    return NextResponse.json(
      {
        error: "処理に失敗しました (Supabase の circulation_texts テーブルがあるかご確認ください)",
        detail: (err instanceof Error ? err.message : String(err)).slice(0, 500),
      },
      { status: 500 }
    );
  }
}
