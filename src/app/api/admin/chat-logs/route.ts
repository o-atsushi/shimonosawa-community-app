import { NextResponse } from "next/server";
import { CHAT_ENVIRONMENT, getChatLogsForAdmin } from "@/lib/chat";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const ALLOWED_DAYS = [7, 30, 90, 365];

// 役員専用: AI相談の質問ログを取得。投稿者は返さない (匿名集計)。
// body: { lineUserId, days }
export async function POST(request: Request) {
  let body: { lineUserId?: unknown; days?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }
  const { lineUserId } = body;
  if (typeof lineUserId !== "string" || !LINE_USER_ID_PATTERN.test(lineUserId)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!(await isAdminLineUser(lineUserId))) {
    return NextResponse.json({ error: "このページの閲覧権限がありません (役員のみ)" }, { status: 403 });
  }
  const days = ALLOWED_DAYS.includes(Number(body.days)) ? Number(body.days) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  try {
    const logs = await getChatLogsForAdmin(since);
    // 画面の初期表示を「本番の質問」か「テストの質問」かに合わせるため、今の環境も返す
    return NextResponse.json({ logs, currentEnvironment: CHAT_ENVIRONMENT });
  } catch (err) {
    console.error("[admin/chat-logs] failed", err);
    return NextResponse.json(
      {
        error:
          "質問ログの取得に失敗しました (Supabase の chat_logs テーブルと SUPABASE_SERVICE_ROLE_KEY の設定をご確認ください)",
        detail: (err instanceof Error ? err.message : String(err)).slice(0, 500),
      },
      { status: 500 }
    );
  }
}
