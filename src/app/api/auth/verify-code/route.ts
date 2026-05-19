import { NextResponse } from "next/server";
import { verifyAccessCode } from "@/lib/access-codes";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MEMBER_COLUMNS, formatMember, isValidLineUserId } from "@/lib/auth";

// アクセスコード入力で準会員として登録する (準会員の初回ログインフロー)。
// 1. コードが access_codes に有効な状態で存在するか確認
// 2. 既に同 line_user_id の members があれば、それを返す
// 3. なければ role=associate で members に新規登録 (氏名は LIFF プロフィールから受け取る)
export async function POST(request: Request) {
  let body: {
    lineUserId?: string;
    code?: string;
    displayName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  if (!isValidLineUserId(body.lineUserId)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json(
      { error: "コードを入力してください" },
      { status: 400 }
    );
  }
  if (
    !body.displayName ||
    typeof body.displayName !== "string" ||
    body.displayName.length > 100
  ) {
    return NextResponse.json(
      { error: "表示名が不正です" },
      { status: 400 }
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "サーバー設定が不完全です" },
      { status: 500 }
    );
  }

  const ac = await verifyAccessCode(body.code);
  if (!ac) {
    return NextResponse.json(
      { error: "コードが無効です。役員にお問い合わせください。" },
      { status: 403 }
    );
  }

  try {
    // 既に同じ line_user_id で登録済みなら更新せず返す (重複登録防止)
    const { data: existing } = await supabaseAdmin
      .from("members")
      .select(MEMBER_COLUMNS)
      .eq("line_user_id", body.lineUserId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        member: formatMember(existing as Parameters<typeof formatMember>[0]),
      });
    }

    const { data: created, error: createErr } = await supabaseAdmin
      .from("members")
      .insert({
        display_name: body.displayName.trim(),
        role: "associate",
        line_user_id: body.lineUserId,
      })
      .select(MEMBER_COLUMNS)
      .single();
    if (createErr || !created) {
      console.error("[verify-code] create error", createErr);
      return NextResponse.json(
        { error: "準会員登録に失敗しました" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      member: formatMember(created as Parameters<typeof formatMember>[0]),
    });
  } catch (err) {
    console.error("[verify-code] threw", err);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
