"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { InquiryCategory } from "@/types";
import {
  INQUIRY_CATEGORY_DESCRIPTIONS,
  INQUIRY_CATEGORY_LABELS,
} from "@/lib/inquiries";
import { getProfile, isLoggedIn } from "@/lib/liff";

const CATEGORIES: InquiryCategory[] = [
  "operations",
  "event",
  "facility",
  "app",
  "other",
];
const TITLE_MAX = 50;
const BODY_MAX = 500;

export default function InquiryForm() {
  const [category, setCategory] = useState<InquiryCategory>("operations");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
    if (body.trim().length === 0) {
      setError("本文を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, body, lineUserId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
        setSubmitting(false);
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
          要望の種類
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
          placeholder="例: 街灯を追加してほしい"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
      </div>

      <div>
        <label
          htmlFor="body"
          className="block text-sm font-bold text-gray-800 mb-2"
        >
          本文
          <span className="text-xs text-gray-400 font-normal ml-2">
            {body.length} / {BODY_MAX}
          </span>
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={6}
          placeholder="詳しい内容を記入してください"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          required
        />
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
        {submitting ? "送信中..." : "投稿する"}
      </button>
    </form>
  );
}
