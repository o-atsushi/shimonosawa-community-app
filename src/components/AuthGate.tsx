"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";
import type { AuthStatus, Member, ServerAuthStatus } from "@/types";

// アプリ全体を包む認証ゲート。LIFF userId を取得した上で /api/auth/check を呼び、
// kind=ok でなければゲート画面 (会員番号入力 or アクセスコード入力 or 未納通知) を表示する。
//
// 公式アカウント未追加・LIFF外アクセスは「LINE経由で開いてください」表示。
// 非ゲートで通過する例外: 開発時 (LIFF ID未設定) は素通し。
export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>({ kind: "loading" });

  async function refresh() {
    if (!isLoggedIn()) {
      // LIFF が未設定 (NEXT_PUBLIC_LIFF_ID 未指定) のローカル開発時は素通し
      if (!process.env.NEXT_PUBLIC_LIFF_ID) {
        setStatus({ kind: "ok", member: developmentMockMember });
        return;
      }
      setStatus({ kind: "needs_line_login" });
      return;
    }
    const profilePromise = getProfile();
    if (!profilePromise) {
      setStatus({ kind: "needs_line_login" });
      return;
    }
    try {
      const profile = await profilePromise;
      const uid = profile?.userId;
      if (!uid) {
        setStatus({ kind: "needs_line_login" });
        return;
      }
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId: uid }),
      });
      const data = (await res.json()) as ServerAuthStatus;
      setStatus(data);
    } catch (err) {
      console.warn("[AuthGate] check failed", err);
      setStatus({ kind: "not_registered" });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (status.kind === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-gray-500">確認中...</p>
      </div>
    );
  }
  if (status.kind === "needs_line_login") {
    return (
      <GateWrapper title="LINEからアクセスしてください">
        <p className="text-sm text-gray-600 mb-3">
          このアプリは LINE 経由で開く必要があります。
          公式アカウントを友だち追加してリッチメニューからアクセスしてください。
        </p>
      </GateWrapper>
    );
  }
  if (status.kind === "not_registered") {
    return <NotRegisteredGate onLinked={() => refresh()} />;
  }
  if (status.kind === "unpaid") {
    const remaining = status.expected - status.paid;
    return (
      <GateWrapper title="会費未納のためご利用いただけません">
        <div className="text-sm text-gray-700 space-y-2 mb-4">
          <p>
            {status.member.displayName} 様、現在お預かりしている当年度の会費が
            不足しています。
          </p>
          <p className="text-xs text-gray-500">
            必要額: ¥{status.expected.toLocaleString()}
            <br />
            納付済み: ¥{status.paid.toLocaleString()}
            <br />
            不足: <span className="text-red-600 font-bold">
              ¥{remaining.toLocaleString()}
            </span>
            {status.member.joinedAt && (
              <>
                <br />
                <span className="text-gray-400">
                  ※ 入会日 {status.member.joinedAt} のため月割計算済み
                </span>
              </>
            )}
          </p>
          <p>
            お支払い後、役員にお知らせください。確認後にご利用いただけるようになります。
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-sm"
        >
          再確認する
        </button>
      </GateWrapper>
    );
  }

  return <>{children}</>;
}

function GateWrapper({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-base font-bold text-gray-800 mb-3">{title}</h1>
        {children}
        <p className="text-xs text-gray-400 mt-4 text-center">
          <Link href="/" className="hover:underline">
            ホームに戻る
          </Link>
        </p>
      </div>
    </div>
  );
}

// 未登録ユーザー: 会員番号入力 (会員) or アクセスコード入力 (準会員) を選ばせる
function NotRegisteredGate({ onLinked }: { onLinked: () => void }) {
  const [mode, setMode] = useState<"choose" | "member" | "associate">("choose");

  if (mode === "choose") {
    return (
      <GateWrapper title="はじめての方へ">
        <p className="text-sm text-gray-600 mb-4">
          ご自身に該当する方を選んでください。
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setMode("member")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm"
          >
            🏠 会員 (戸建てなど)
          </button>
          <button
            type="button"
            onClick={() => setMode("associate")}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg text-sm"
          >
            🏢 準会員 (賃貸マンション)
          </button>
        </div>
      </GateWrapper>
    );
  }
  if (mode === "member") {
    return (
      <LinkMemberForm
        onBack={() => setMode("choose")}
        onLinked={onLinked}
      />
    );
  }
  return (
    <VerifyCodeForm onBack={() => setMode("choose")} onLinked={onLinked} />
  );
}

function LinkMemberForm({
  onBack,
  onLinked,
}: {
  onBack: () => void;
  onLinked: () => void;
}) {
  const [memberNumber, setMemberNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = parseInt(memberNumber, 10);
    if (!Number.isInteger(num) || num <= 0) {
      setError("会員番号は半角数字で入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const profile = await getProfile();
      const uid = profile?.userId;
      if (!uid) {
        setError("LINE認証が必要です");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/auth/link-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId: uid, memberNumber: num }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "紐付けに失敗しました");
        setSubmitting(false);
        return;
      }
      onLinked();
    } catch {
      setError("通信エラーが発生しました");
      setSubmitting(false);
    }
  }

  return (
    <GateWrapper title="会員番号を入力してください">
      <p className="text-xs text-gray-500 mb-3">
        役員から伝えられた会員番号 (4桁程度の数字) を入力してください。
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="number"
          inputMode="numeric"
          value={memberNumber}
          onChange={(e) => setMemberNumber(e.target.value)}
          placeholder="例: 1"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          autoFocus
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm"
        >
          {submitting ? "確認中..." : "アプリを開始する"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-gray-500 text-xs hover:underline"
        >
          ← 戻る
        </button>
      </form>
    </GateWrapper>
  );
}

function VerifyCodeForm({
  onBack,
  onLinked,
}: {
  onBack: () => void;
  onLinked: () => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("コードを入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const profile = await getProfile();
      const uid = profile?.userId;
      const displayName = profile?.displayName ?? "ご利用者";
      if (!uid) {
        setError("LINE認証が必要です");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: uid,
          code: code.trim(),
          displayName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "認証に失敗しました");
        setSubmitting(false);
        return;
      }
      onLinked();
    } catch {
      setError("通信エラーが発生しました");
      setSubmitting(false);
    }
  }

  return (
    <GateWrapper title="アクセスコードを入力してください">
      <p className="text-xs text-gray-500 mb-3">
        賃貸マンション管理会社から配布されたアクセスコードを入力してください。
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="アクセスコード"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          autoFocus
          maxLength={50}
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm"
        >
          {submitting ? "確認中..." : "アプリを開始する"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-gray-500 text-xs hover:underline"
        >
          ← 戻る
        </button>
      </form>
    </GateWrapper>
  );
}

// LIFF ID 未設定時のローカル開発用ダミー member
const developmentMockMember: Member = {
  id: "dev-mock-id",
  memberNumber: 0,
  displayName: "開発モード",
  role: "member",
  lineUserId: null,
  household: null,
  notes: null,
  isAdmin: true,
  joinedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
