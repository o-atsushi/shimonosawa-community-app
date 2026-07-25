"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import type { Category } from "@/types";

const BODY_MAX = 1000;

// お知らせ (news / events) 記事へのコメント投稿フォーム。
// 課題用の CommentForm とほぼ同構造だが、articleId と articleCategory を
// 受け取り、/api/article-comments に POST する。
export default function ArticleCommentForm({
  articleId,
  articleCategory,
}: {
  articleId: string;
  articleCategory: Category;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | undefined>(undefined);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      setAuthChecked(true);
      return;
    }
    const p = getProfile();
    if (!p) {
      setAuthChecked(true);
      return;
    }
    p.then((profile) => {
      if (profile?.userId) setLineUserId(profile.userId);
    })
      .catch((err) => {
        console.warn("[ArticleCommentForm] failed to get LIFF profile", err);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (body.trim().length === 0) {
      setError("コメントを入力してください");
      return;
    }
    if (!lineUserId) {
      setError("LINEログインが必要です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/article-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          articleCategory,
          body,
          lineUserId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
        setSubmitting(false);
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) return null;

  if (!lineUserId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        💡 コメントを投稿するには LINE 経由でアプリを開く必要があります。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor={`article-comment-body-${articleId}`}
          className="block text-sm font-bold text-gray-800 mb-2"
        >
          コメントを投稿
          <span className="text-xs text-gray-400 font-normal ml-2">
            {body.length} / {BODY_MAX}
          </span>
        </label>
        <textarea
          id={`article-comment-body-${articleId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={4}
          placeholder="ご意見・気になることなどをお書きください"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          required
        />
      </div>

      <p className="text-xs text-gray-500">
        🔒 「自治会員」として匿名で投稿されます。個人情報は記入しないでください。
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg transition-colors"
      >
        {submitting ? "送信中..." : "コメントを投稿"}
      </button>
    </form>
  );
}
