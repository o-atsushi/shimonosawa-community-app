"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InquiryCategory } from "@/types";
import { INQUIRY_CATEGORY_LABELS } from "@/lib/inquiries";

const CATEGORIES: InquiryCategory[] = ["request", "question", "other"];
const TITLE_MAX = 50;
const BODY_MAX = 500;

export default function InquiryForm() {
  const router = useRouter();
  const [category, setCategory] = useState<InquiryCategory>("request");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ category, title, body }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
        setSubmitting(false);
        return;
      }

      router.push("/inquiries");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          カテゴリ
        </label>
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <label
              key={c}
              className={`flex-1 text-center text-sm py-2 rounded-lg border cursor-pointer transition-colors ${
                category === c
                  ? "bg-green-600 text-white border-green-600 font-bold"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="category"
                value={c}
                checked={category === c}
                onChange={() => setCategory(c)}
                className="sr-only"
              />
              {INQUIRY_CATEGORY_LABELS[c]}
            </label>
          ))}
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
          placeholder="例: 公園の遊具が壊れています"
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

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
        <p className="mb-1">📝 投稿は匿名で行われます。</p>
        <p>個人情報は投稿しないようご注意ください。</p>
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
