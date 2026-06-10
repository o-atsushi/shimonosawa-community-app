// クライアント側で画像を縮小・圧縮する。
// スマホで撮った写真は 5〜10MB を超えることが珍しくなく、Vercel の
// API ルートには 4.5MB のリクエストボディ上限があるため、そのまま
// アップロードすると失敗する。
//
// JPEG にエンコードし直し、長辺を maxDim までに収める。
// アルファチャネルや透過 PNG はあえて潰す (回覧書類の写真用途のため)。

const DEFAULT_MAX_DIM = 2000; // 長辺の上限 px
const DEFAULT_QUALITY = 0.85;

export interface CompressOptions {
  maxDim?: number;
  quality?: number;
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  // 画像ではない or サポート外形式はそのまま返す
  if (!file.type.startsWith("image/")) return file;
  // GIF はアニメーションを潰さないために圧縮対象外 (回覧板で使うことはほぼないが念のため)
  if (file.type === "image/gif") return file;

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  let { width, height } = img;
  // 長辺を maxDim 以下に
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // フォールバック
  // 白背景を敷いて透過 PNG が真っ黒にならないようにする
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  // ファイル名: 元のファイル名から拡張子を取り除いて .jpg を付ける
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  const compressed = new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  // 元のほうが小さい場合は元を返す (既に小さく圧縮されていた写真は触らない)
  if (compressed.size > file.size) return file;
  return compressed;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}
