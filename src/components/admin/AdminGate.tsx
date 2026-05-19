"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";

type AuthState =
  | { kind: "loading" }
  | { kind: "needs_line_login" }
  | { kind: "not_member" }
  | { kind: "not_admin" }
  | { kind: "ok"; lineUserId: string };

// /admin 配下を包む権限チェックラッパー。
// LIFF userId を取得 → /api/admin/members の GET で疎通＆権限確認 (401/403 で弾く)。
// 成功した場合のみ children を描画し、lineUserId を render-prop で渡す。
export default function AdminGate({
  children,
}: {
  children: (ctx: { lineUserId: string }) => ReactNode;
}) {
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!isLoggedIn()) {
        if (!cancelled) setAuth({ kind: "needs_line_login" });
        return;
      }
      const profilePromise = getProfile();
      if (!profilePromise) {
        if (!cancelled) setAuth({ kind: "needs_line_login" });
        return;
      }
      try {
        const profile = await profilePromise;
        const uid = profile?.userId;
        if (!uid) {
          if (!cancelled) setAuth({ kind: "needs_line_login" });
          return;
        }
        // 役員チェック (members GET で 200 が返れば admin、403 なら not admin)
        const res = await fetch(
          `/api/admin/members?lineUserId=${encodeURIComponent(uid)}`
        );
        if (res.ok) {
          if (!cancelled) setAuth({ kind: "ok", lineUserId: uid });
          return;
        }
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          const reason =
            typeof data.error === "string" && data.error.includes("会員")
              ? "not_member"
              : "not_admin";
          if (!cancelled)
            setAuth({ kind: reason === "not_member" ? "not_member" : "not_admin" });
          return;
        }
        if (!cancelled) setAuth({ kind: "not_admin" });
      } catch (err) {
        console.warn("[AdminGate] check failed", err);
        if (!cancelled) setAuth({ kind: "not_admin" });
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (auth.kind === "loading") {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">確認中...</p>
      </div>
    );
  }
  if (auth.kind === "needs_line_login") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-sm text-yellow-800 mb-2">
          この画面は LINE 経由で開く必要があります。
        </p>
        <Link href="/" className="text-green-600 text-sm hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }
  if (auth.kind === "not_member") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm text-red-700 mb-2">
          会員として登録されていません。
        </p>
        <p className="text-xs text-gray-600 mb-3">
          自治会役員に登録を依頼してください。
        </p>
        <Link href="/" className="text-green-600 text-sm hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }
  if (auth.kind === "not_admin") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm text-red-700 mb-2">
          この画面は役員専用です。
        </p>
        <Link href="/" className="text-green-600 text-sm hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  return <>{children({ lineUserId: auth.lineUserId })}</>;
}
