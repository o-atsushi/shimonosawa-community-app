import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createCirculation } from "@/lib/circulations";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const TITLE_MAX = 100;
const MAX_IMAGES = 10;

// 役員のみ。タイトル + アップロード済み画像 URL 一覧で回覧板を新規作成する。
// 画像本体は /api/uploads/circulation-image で先に Supabase Storage にアップロードされ、
// public URL がクライアントに返ってきた状態を前提とする。
export async function POST(request: Request) {
  let body: { title?: string; imageUrls?: string[]; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { title, imageUrls, lineUserId } = body;

  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "回覧板の投稿は役員のみ可能です" },
      { status: 403 }
    );
  }
  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.length > TITLE_MAX
  ) {
    return NextResponse.json(
      { error: `タイトルを 1〜${TITLE_MAX} 文字で入力してください` },
      { status: 400 }
    );
  }
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return NextResponse.json(
      { error: "画像を 1 枚以上選択してください" },
      { status: 400 }
    );
  }
  if (imageUrls.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `画像は最大 ${MAX_IMAGES} 枚までです` },
      { status: 400 }
    );
  }
  // URL は Supabase Storage 配下のみ受け付ける (任意 URL を埋め込まれないように)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const allowedPrefix = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/circulation-images/`
    : null;
  for (const u of imageUrls) {
    if (
      typeof u !== "string" ||
      !allowedPrefix ||
      !u.startsWith(allowedPrefix)
    ) {
      return NextResponse.json(
        { error: "画像 URL が不正です" },
        { status: 400 }
      );
    }
  }

  try {
    const created = await createCirculation(title.trim(), imageUrls, lineUserId);
    revalidatePath("/circulation");
    return NextResponse.json({ circulation: created }, { status: 201 });
  } catch (err) {
    console.error("[circulations] create failed", err);
    return NextResponse.json(
      { error: "保存に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
