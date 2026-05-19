import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MEMBER_COLUMNS, formatMember, isValidLineUserId } from "@/lib/auth";

// 会員番号と LIFF userId を紐付ける (会員の初回ログインフロー)。
// 役員が事前に追加した members レコード (line_user_id が NULL) を、
// 会員番号で検索 → 一致したら line_user_id を更新する。
export async function POST(request: Request) {
  let body: { lineUserId?: string; memberNumber?: number | string };
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
  const memberNumber =
    typeof body.memberNumber === "string"
      ? parseInt(body.memberNumber, 10)
      : body.memberNumber;
  if (
    typeof memberNumber !== "number" ||
    !Number.isInteger(memberNumber) ||
    memberNumber <= 0
  ) {
    return NextResponse.json(
      { error: "会員番号が不正です" },
      { status: 400 }
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "サーバー設定が不完全です" },
      { status: 500 }
    );
  }

  try {
    // 既に他の line_user_id が紐付いている場合は弾く
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("members")
      .select(MEMBER_COLUMNS)
      .eq("member_number", memberNumber)
      .maybeSingle();
    if (findErr) {
      console.error("[link-member] find error", findErr);
      return NextResponse.json(
        { error: "会員情報の取得に失敗しました" },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: "該当する会員番号がありません。役員にお問い合わせください。" },
        { status: 404 }
      );
    }
    const row = existing as Parameters<typeof formatMember>[0];
    if (row.line_user_id && row.line_user_id !== body.lineUserId) {
      return NextResponse.json(
        {
          error:
            "この会員番号は既に別の LINE アカウントに紐付いています。役員にお問い合わせください。",
        },
        { status: 409 }
      );
    }
    if (row.line_user_id === body.lineUserId) {
      return NextResponse.json({ member: formatMember(row) });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("members")
      .update({
        line_user_id: body.lineUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select(MEMBER_COLUMNS)
      .single();
    if (updateErr || !updated) {
      console.error("[link-member] update error", updateErr);
      return NextResponse.json(
        { error: "紐付けに失敗しました" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      member: formatMember(updated as Parameters<typeof formatMember>[0]),
    });
  } catch (err) {
    console.error("[link-member] threw", err);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
