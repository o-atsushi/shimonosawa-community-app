import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKET = "inquiry-images";

// 住民投稿リッチエディタからの画像アップロード受け口。
// multipart/form-data で image (File) と lineUserId (string) を受け取り、
// Supabase Storage の inquiry-images バケットに保存して public URL を返す。
//
// 認可: LINE userId のフォーマット (U + 32hex) のみ検証。
//       完全な署名検証はしておらず、悪意ある書き込みは Supabase の
//       bucket policy + 本ファイル側のバリデーション (mime / size) で守る。
//
// 設置時の Supabase 側設定 (PR 本文に記載):
//   - public bucket `inquiry-images` を作成
//   - storage.objects に対し INSERT を anon に許可するポリシー
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
      { error: "画像サイズが大きすぎます (上限 5MB)" },
      { status: 400 }
    );
  }

  // 衝突しない命名: yyyymmdd/<userId 前 8 桁>-<timestamp>-<rand>.<ext>
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${yyyymmdd}/${lineUserId.slice(1, 9)}-${now.getTime()}-${rand}.${safeExt}`;

  try {
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadErr) {
      console.error("[uploads/inquiry-image] upload failed", uploadErr);
      return NextResponse.json(
        { error: "画像の保存に失敗しました" },
        { status: 500 }
      );
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[uploads/inquiry-image] threw", err);
    return NextResponse.json(
      { error: "画像の保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
