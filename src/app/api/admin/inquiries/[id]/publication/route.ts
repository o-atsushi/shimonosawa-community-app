import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getInquiry, setInquiryPublication } from "@/lib/inquiries";
import { isAdminLineUser } from "@/lib/members";
import { pushTextToUser } from "@/lib/line-messaging";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 役員のみ: 要望/質問の公開状態 (isPublished) を切り替える。
// body: { isPublished: boolean, lineUserId: string }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { isPublished?: boolean; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { isPublished, lineUserId } = body;
  if (typeof isPublished !== "boolean") {
    return NextResponse.json(
      { error: "公開状態が不正です" },
      { status: 400 }
    );
  }
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "公開操作は役員のみ可能です" },
      { status: 403 }
    );
  }
  // 通知のため事前に投稿を取得 (タイトル / 投稿者の lineUserId / 現在の公開状態)
  // 投稿が見つからない場合や取得失敗時は通知をスキップし、本処理は続行する。
  let target: Awaited<ReturnType<typeof getInquiry>> = undefined;
  try {
    target = await getInquiry(id);
  } catch (err) {
    console.warn("[admin/inquiries/publication] fetch before update failed", err);
  }

  try {
    await setInquiryPublication(id, isPublished);
    // 住民/ホームの一覧キャッシュを破棄
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/");

    // false → true の遷移時だけ、投稿者本人に LINE 通知を送る (fire-and-forget)
    // env (LINE_MESSAGING_CHANNEL_ACCESS_TOKEN) 未設定なら pushTextToUser 内で
    // 静かにスキップされる。
    const wasUnpublished = target && !target.isPublished;
    if (
      isPublished === true &&
      wasUnpublished &&
      target?.lineUserId
    ) {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
      const detailUrl = liffId
        ? `https://liff.line.me/${liffId}/inquiries/${id}`
        : "";
      const lines = [
        `📣 ご投稿が公開されました`,
        "",
        `タイトル: ${target.title}`,
      ];
      if (detailUrl) {
        lines.push("", "詳細はこちら:", detailUrl);
      }
      void pushTextToUser(target.lineUserId, lines.join("\n")).catch((err) => {
        console.warn("[admin/inquiries/publication] author notify failed", err);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/inquiries/publication] update failed", err);
    return NextResponse.json(
      { error: "公開状態の更新に失敗しました" },
      { status: 500 }
    );
  }
}
