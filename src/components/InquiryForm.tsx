"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Inquiry, InquiryCategory, InquiryKind } from "@/types";
import {
  INQUIRY_CATEGORY_DESCRIPTIONS,
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_KIND_DESCRIPTIONS,
  INQUIRY_KIND_LABELS,
} from "@/lib/inquiries";
import { getProfile, isLoggedIn } from "@/lib/liff";
import RichEditor from "@/components/RichEditor";

const KINDS: InquiryKind[] = ["question", "request"];
const CATEGORIES: InquiryCategory[] = [
  "operations",
  "event",
  "facility",
  "app",
  "other",
];
const TITLE_MAX = 50;
// 本文はリッチエディタ (HTML) なのでタグの分だけ余裕を持たせる。
// プレーン文字数換算では実質 500〜800 字程度を想定。
const BODY_MAX_HTML = 5000;

// HTML から空判定するためのヘルパー
function isHtmlEmpty(html: string): boolean {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim()
    .length === 0;
}

// initial を渡すと「編集モード」になり PUT /api/inquiries/[id] を叩く。
// 編集モードでは送信成功後に該当投稿の詳細ページに戻す。
export default function InquiryForm({ initial }: { initial?: Inquiry } = {}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [kind, setKind] = useState<InquiryKind>(initial?.kind ?? "request");
  const [category, setCategory] = useState<InquiryCategory>(
    initial?.category ?? "operations"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // LIFF ログイン済みなら userId を保持する。未ログイン / 非LIFF環境では undefined のまま
  const [lineUserId, setLineUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const profilePromise = getProfile();
    if (!profilePromise) return;
    profilePromise
      .then((profile) => {
        if (profile?.userId) setLineUserId(profile.userId);
      })
      .catch((err) => {
        // LIFF外やネットワーク失敗時は通知を諦め、投稿は通常通り可能
        console.warn("[InquiryForm] failed to get LIFF profile", err);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError("タイトルを入力してください");
      return;
    }
    if (isHtmlEmpty(body)) {
      setError("本文を入力してください");
      return;
    }
    if (body.length > BODY_MAX_HTML) {
      setError("本文が長すぎます。文章量を減らすか画像を整理してください");
      return;
    }

    setSubmitting(true);
    try {
      let res: Response;
      if (isEdit) {
        // 編集モード: PUT。lineUserId は所有権検証用
        if (!lineUserId) {
          setError("LINE 経由でアプリを開き直してください");
          setSubmitting(false);
          return;
        }
        res = await fetch(`/api/inquiries/${initial!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId,
            input: { kind, category, title, body },
          }),
        });
      } else {
        // 新規投稿
        res = await fetch("/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, category, title, body, lineUserId }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
        setSubmitting(false);
        return;
      }

      if (isEdit) {
        // 編集完了 → 該当投稿の詳細に戻る
        router.push(`/inquiries/${initial!.id}`);
        router.refresh();
        return;
      }
      setSubmitted(true);
    } catch {
      setError("通信エラーが発生しました");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          投稿ありがとうございました
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          内容を役員が確認のうえ、要望一覧に公開します。
          <br />
          公開まで少しお時間をいただく場合があります。
        </p>
        <Link
          href="/inquiries"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          要望一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          投稿の種別
        </label>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => {
            const selected = kind === k;
            return (
              <label
                key={k}
                className={`flex flex-col items-start gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected
                    ? "bg-green-50 border-green-600"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={selected}
                    onChange={() => setKind(k)}
                    className="accent-green-600"
                  />
                  <span
                    className={`text-sm ${selected ? "font-bold text-green-700" : "text-gray-800"}`}
                  >
                    {INQUIRY_KIND_LABELS[k]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">
                  {INQUIRY_KIND_DESCRIPTIONS[k]}
                </p>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          カテゴリ
        </label>
        <div className="space-y-2">
          {CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <label
                key={c}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected
                    ? "bg-green-50 border-green-600"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={selected}
                  onChange={() => setCategory(c)}
                  className="mt-0.5 accent-green-600"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${selected ? "font-bold text-green-700" : "text-gray-800"}`}
                  >
                    {INQUIRY_CATEGORY_LABELS[c]}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {INQUIRY_CATEGORY_DESCRIPTIONS[c]}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

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
          placeholder={
            kind === "question"
              ? "例: 会費はいつまでに払えばいいですか？"
              : "例: 街灯を追加してほしい"
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          本文
          <span className="text-xs text-gray-400 font-normal ml-2">
            画像・太字・見出し・リスト・リンクが使えます
          </span>
        </label>
        <RichEditor
          value={body}
          onChange={setBody}
          lineUserId={lineUserId}
          placeholder="詳しい内容を記入してください"
        />
        {!lineUserId && (
          <p className="text-xs text-gray-400 mt-1">
            ※ LINE ログインしていない場合は画像の挿入はできません
          </p>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
        <p>📝 投稿は匿名で一覧に表示されます。</p>
        <p>個人情報は投稿しないようご注意ください。</p>
        <p>役員の確認後に一覧へ公開されます。</p>
        {lineUserId ? (
          <p>🔔 回答が公開されたら LINE にお知らせが届きます。</p>
        ) : null}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
      >
        {submitting
          ? isEdit
            ? "更新中..."
            : "送信中..."
          : isEdit
            ? "更新する"
            : "投稿する"}
      </button>
    </form>
  );
}
