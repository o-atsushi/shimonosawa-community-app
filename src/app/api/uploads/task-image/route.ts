import { NextResponse } from "next/server";
import { isAdminLineUser } from "@/lib/members";
import { supabase } from "@/lib/supabase";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 4 * 1024 * 1024; // 4MB (Vercel API ボディ上限 4.5MB)
// 役員のタスク本文用画像。inquiry-images バケットを再利用する。
// (新しいバケット作成を避けて運用負荷を下げる。役員投稿なので住民投稿と
//  画像が混在しても問題ない)
const BUCKET = "inquiry-images";

// 役員が新設課題 (タスク) を作成/編集する時に、本文に貼る画像をアップロードする。
// 認可: LINE userId フォーマット + members.is_admin = true
export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "ストレージ設定が未構成です" },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }

  const lineUserId = form.get("lineUserId");
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "課題の画像アップロードは役員のみ可能です" },
      { status: 403 }
    );
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "image ファイルがありません" },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "対応していない画像形式です (jpeg / png / webp / gif のみ)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "画像サイズが大きすぎます (上限 4MB)" },
      { status: 400 }
    );
  }

  // task- プレフィックスで命名し、住民投稿の inquiry- とディレクトリで区別する
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `task/${yyyymmdd}/${lineUserId.slice(1, 9)}-${now.getTime()}-${rand}.${safeExt}`;

  try {
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadErr) {
      console.error("[uploads/task-image] upload failed", uploadErr);
      return NextResponse.json(
        { error: "画像の保存に失敗しました" },
        { status: 500 }
      );
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[uploads/task-image] threw", err);
    return NextResponse.json(
      { error: "画像の保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
