"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";

const TITLE_MAX = 100;
const MAX_IMAGES = 10;

interface PendingImage {
  // 表示用のプレビュー URL (object URL)
  previewUrl: string;
  // ファイル本体 (アップロード時に使用)
  file: File;
  // アップロード後の Supabase URL (成功時のみ)
  uploadedUrl?: string;
  uploading?: boolean;
  error?: string;
}

// 役員のみが使う回覧板アップロードフォーム。
// 役員チェックは /api/members/me で行い、非役員にはフォーム自体を表示しない。
export default function UploadCirculationForm() {
  const router = useRouter();
  // 撮影 (capture="environment") とアルバム選択は同じ画面でも分けたほうが
  // OS の挙動差 (特に Android Chrome) で迷いにくいため、input を 2 つ用意する。
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);

  const [authState, setAuthState] = useState<
    "loading" | "needs_login" | "forbidden" | "ready"
  >("loading");
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setAuthState("needs_login");
      return;
    }
    const p = getProfile();
    if (!p) {
      setAuthState("needs_login");
      return;
    }
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) {
        setAuthState("needs_login");
        return;
      }
      setLineUserId(uid);
      try {
        const res = await fetch(
          `/api/members/me?lineUserId=${encodeURIComponent(uid)}`
        );
        if (!res.ok) {
          setAuthState("needs_login");
          return;
        }
        const data = await res.json();
        if (data.member?.isAdmin) setAuthState("ready");
        else setAuthState("forbidden");
      } catch {
        setAuthState("forbidden");
      }
    }).catch(() => setAuthState("needs_login"));
  }, []);

  // 各画像を Supabase Storage にアップロードして URL を埋める
  async function uploadOne(idx: number, file: File): Promise<string | null> {
    if (!lineUserId) return null;
    const fd = new FormData();
    fd.append("image", file);
    fd.append("lineUserId", lineUserId);
    const res = await fetch("/api/uploads/circulation-image", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "画像のアップロードに失敗しました");
    }
    const data: { url?: string } = await res.json();
    if (!data.url) throw new Error("画像 URL が取得できませんでした");
    return data.url;
  }

  async function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      alert(`画像は最大 ${MAX_IMAGES} 枚までです`);
      return;
    }
    const list = Array.from(files).slice(0, room);
    const newItems: PendingImage[] = list.map((f) => ({
      previewUrl: URL.createObjectURL(f),
      file: f,
      uploading: true,
    }));
    const startIdx = images.length;
    setImages((prev) => [...prev, ...newItems]);

    // 1 枚ずつアップロード (並列も可だが小さい自治会なので逐次で十分)
    for (let i = 0; i < list.length; i++) {
      const idx = startIdx + i;
      try {
        const url = await uploadOne(idx, list[i]);
        if (!url) throw new Error("URL 取得失敗");
        setImages((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            uploading: false,
            uploadedUrl: url,
          };
          return next;
        });
      } catch (e) {
        setImages((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            uploading: false,
            error: e instanceof Error ? e.message : "失敗",
          };
          return next;
        });
      }
    }
  }

  function removeAt(idx: number) {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(idx, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lineUserId) return;
    const t = title.trim();
    if (t.length === 0 || t.length > TITLE_MAX) {
      setError(`タイトルを 1〜${TITLE_MAX} 文字で入力してください`);
      return;
    }
    const urls = images
      .map((i) => i.uploadedUrl)
      .filter((u): u is string => !!u);
    if (urls.length === 0) {
      setError("画像を 1 枚以上アップロードしてください");
      return;
    }
    if (images.some((i) => i.uploading)) {
      setError("画像のアップロード中です。完了をお待ちください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/circulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, imageUrls: urls, lineUserId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "保存に失敗しました");
        return;
      }
      // 成功 → 一覧に戻る
      router.push("/circulation");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (authState === "loading") {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }
  if (authState === "needs_login") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        LINE 経由でアプリを開いてください。
      </div>
    );
  }
  if (authState === "forbidden") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        回覧板のアップロードは役員のみ可能です。
      </div>
    );
  }

  const anyUploading = images.some((i) => i.uploading);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-5"
    >
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-bold text-gray-800 mb-2"
        >
          タイトル
          <span className="text-xs text-gray-400 font-normal ml-2">
            {title.length} / {TITLE_MAX}
          </span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="例: 市役所からのお知らせ (2026年5月)"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          写真 ({images.length} / {MAX_IMAGES})
        </label>
        {/* 撮影用 (capture でカメラ起動を促す) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            handleFilesPicked(e.target.files);
            if (e.target) e.target.value = "";
          }}
          className="hidden"
        />
        {/* アルバム選択用 (capture なし。複数選択可) */}
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            handleFilesPicked(e.target.files);
            if (e.target) e.target.value = "";
          }}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="border-2 border-dashed border-gray-300 hover:border-green-500 text-sm text-gray-600 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl block leading-tight">📷</span>
            写真を撮影
          </button>
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="border-2 border-dashed border-gray-300 hover:border-green-500 text-sm text-gray-600 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl block leading-tight">🖼</span>
            アルバムから選択
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          アルバムからは **まとめて複数枚** 選択できます (最大 {MAX_IMAGES} 枚 / 1 枚 10MB まで)
        </p>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {images.map((img, idx) => (
              <div
                key={img.previewUrl}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={`写真 ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {img.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs">
                    アップロード中...
                  </div>
                )}
                {img.error && (
                  <div className="absolute inset-0 bg-red-600/70 flex items-center justify-center text-white text-xs p-1 text-center">
                    {img.error}
                  </div>
                )}
                {!img.uploading && img.uploadedUrl && (
                  <span className="absolute bottom-1 left-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    ✓
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || anyUploading || images.length === 0}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-sm"
      >
        {submitting
          ? "保存中..."
          : anyUploading
            ? "画像アップロード中..."
            : "公開する"}
      </button>
    </form>
  );
}
