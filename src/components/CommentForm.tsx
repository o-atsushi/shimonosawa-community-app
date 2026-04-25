"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";

const BODY_MAX = 1000;

export default function CommentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // LIFF ログイン済みなら userId を保持。未ログインだとフォーム disabled
  const [lineUserId, setLineUserId] = useState<string | undefined>(undefined);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      setAuthChecked(true);
      return;
    }
    const profilePromise = getProfile();
    if (!profilePromise) {
      setAuthChecked(true);
      return;
    }
    profilePromise
      .then((profile) => {
        if (profile?.userId) setLineUserId(profile.userId);
      })
      .catch((err) => {
        console.warn("[CommentForm] failed to get LIFF profile", err);
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
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, body, lineUserId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
        setSubmitting(false);
        return;
      }

      // 成功: フォームをクリアし、Server Component のコメント一覧を再取得
      setBody("");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  // LIFF ログイン状態確認中はフォームを描画しない (チラつき防止)
  if (!authChecked) {
    return null;
  }

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
          htmlFor="comment-body"
          className="block text-sm font-bold text-gray-800 mb-2"
        >
          コメントを投稿
          <span className="text-xs text-gray-400 font-normal ml-2">
            {body.length} / {BODY_MAX}
          </span>
        </label>
        <textarea
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={4}
          placeholder="ご意見・補足などをお書きください"
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
