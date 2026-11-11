"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

interface Message {
  role: "user" | "assistant";
  content: string;
  logId?: string | null;
  answerable?: boolean;
  feedback?: boolean;
  // 安い AI で答えた回答。上位の AI で答え直せる
  canRetryDetailed?: boolean;
  // 「詳しい AI で答え直す」で作られた回答
  detailed?: boolean;
}

const EXAMPLES = [
  "自治会費はいくらですか？",
  "設立総会はいつ、どこで開かれますか？",
  "粗大ごみはどうやって出せばいいですか？",
];

export default function ChatPage() {
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  // LiffProvider が liff.init() 完了後にだけ描画するので、初期化時点でログイン判定できる
  const [status, setStatus] = useState<"loading" | "needs_login" | "ready">(() =>
    isLoggedIn() ? "loading" : "needs_login"
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then((profile) => {
      if (profile?.userId) {
        setLineUserId(profile.userId);
        setStatus("ready");
      } else {
        setStatus("needs_login");
      }
    }).catch(() => setStatus("needs_login"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending || !lineUserId) return;
    setError(null);
    setSending(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    // 新しい質問を送ったら、前の回答の「答え直す」ボタンは消す (会話の流れが変わるため)
    setMessages((prev) => [
      ...prev.map((x) => (x.canRetryDetailed ? { ...x, canRetryDetailed: false } : x)),
      { role: "user", content: question },
    ]);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId, sessionId, question, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "回答の作成に失敗しました");
        // 失敗した質問は履歴から外し、入力欄に戻す
        setMessages((prev) => prev.slice(0, -1));
        setInput(question);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          logId: data.logId,
          answerable: data.answerable,
          canRetryDetailed: data.canRetryDetailed === true,
        },
      ]);
    } catch {
      setError("通信エラーが発生しました。電波の良い場所でもう一度お試しください。");
      setMessages((prev) => prev.slice(0, -1));
      setInput(question);
    } finally {
      setSending(false);
    }
  }

  // 安い AI の回答に満足できなかった時、同じ質問を上位の AI で答え直す
  async function retryDetailed(index: number) {
    const m = messages[index];
    const q = messages[index - 1];
    if (!m?.logId || !m.canRetryDetailed || q?.role !== "user" || sending || !lineUserId) return;
    setError(null);
    setSending(true);
    setMessages((prev) => prev.map((x, i) => (i === index ? { ...x, canRetryDetailed: false } : x)));
    const history = messages.slice(0, index - 1).map((x) => ({ role: x.role, content: x.content }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId, sessionId, question: q.content, history, retryOf: m.logId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "回答の作成に失敗しました");
        return;
      }
      // 答え直しの回答は元の回答のすぐ後ろに入れる
      setMessages((prev) => [
        ...prev.slice(0, index + 1),
        {
          role: "assistant",
          content: data.answer,
          logId: data.logId,
          answerable: data.answerable,
          detailed: true,
        },
        ...prev.slice(index + 1),
      ]);
    } catch {
      setError("通信エラーが発生しました。電波の良い場所でもう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  async function sendFeedback(index: number, helpful: boolean) {
    const m = messages[index];
    if (!m?.logId || !lineUserId || m.feedback !== undefined) return;
    setMessages((prev) => prev.map((x, i) => (i === index ? { ...x, feedback: helpful } : x)));
    try {
      await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId, logId: m.logId, helpful }),
      });
    } catch {
      // 評価の保存失敗は住民に知らせるほどではない
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }
  if (status === "needs_login") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        AI相談は LINE からアプリを開いてご利用ください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">🤖 AI相談</h1>
        <p className="text-xs text-gray-600 mt-1">
          自治会の資料をもとに AI がお答えします。野洲市のことも一般的な範囲でお答えできます。
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-600 leading-relaxed">
        ・AI の回答には誤りが含まれることがあります。大事なことは役員にご確認ください。
        <br />
        ・質問内容は、自治会運営の改善のために匿名で集計します。お名前・住所などの個人情報は入力しないでください。
      </div>

      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">質問の例 (タップで送信)</p>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => send(ex)}
              disabled={sending}
              className="block w-full text-left text-sm bg-white border border-green-200 rounded-lg px-3 py-2 text-green-800 hover:bg-green-50"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-green-600 text-white text-sm rounded-2xl rounded-br-sm px-3 py-2 whitespace-pre-wrap break-words">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex flex-col items-start gap-1.5">
              {m.detailed && <span className="text-[11px] text-gray-500">🔍 詳しい AI の回答</span>}
              <div className="max-w-[90%] bg-white border border-gray-200 text-gray-800 text-sm rounded-2xl rounded-bl-sm px-3 py-2 whitespace-pre-wrap break-words">
                {m.content}
              </div>
              {m.canRetryDetailed && (
                <button
                  type="button"
                  onClick={() => retryDetailed(i)}
                  disabled={sending}
                  className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                >
                  🔍 詳しい AI で答え直す
                </button>
              )}
              {m.answerable === false && (
                <Link
                  href="/inquiries/new"
                  className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 hover:bg-green-100"
                >
                  ✉️ 役員に相談する
                </Link>
              )}
              {m.logId && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {m.feedback === undefined ? (
                    <>
                      <span>この回答は役に立ちましたか？</span>
                      <button
                        type="button"
                        onClick={() => sendFeedback(i, true)}
                        className="px-2 py-0.5 border border-gray-200 rounded-full hover:bg-gray-50"
                        aria-label="役に立った"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        onClick={() => sendFeedback(i, false)}
                        className="px-2 py-0.5 border border-gray-200 rounded-full hover:bg-gray-50"
                        aria-label="役に立たなかった"
                      >
                        👎
                      </button>
                    </>
                  ) : (
                    <span>評価ありがとうございます</span>
                  )}
                </div>
              )}
            </div>
          )
        )}
        {sending && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
            回答を作成中です…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-20 bg-white border border-gray-200 rounded-xl p-2 flex gap-2 shadow-sm"
      >
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="質問を入力"
          rows={2}
          maxLength={500}
          className="flex-1 resize-none text-sm outline-none px-1"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="self-end bg-green-600 text-white text-sm font-bold rounded-lg px-4 py-2 disabled:opacity-40"
        >
          送信
        </button>
      </form>

      {messages.length > 0 && (
        <p className="text-center">
          <Link href="/inquiries/new" className="text-xs text-green-700 underline">
            解決しない場合は役員に相談する
          </Link>
        </p>
      )}
    </div>
  );
}
