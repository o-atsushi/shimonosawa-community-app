"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InquiryForm from "@/components/InquiryForm";
import { getProfile, isLoggedIn } from "@/lib/liff";
import type { Inquiry } from "@/types";

// 投稿者本人による編集ページのクライアントゲート。
// SSR で取得した inquiry を受け取り、
// - LIFF userId が一致するか
// - isPublished が false か
// を満たした時だけ InquiryForm を出す。
export default function OwnInquiryEditPage({ inquiry }: { inquiry: Inquiry }) {
  const [authState, setAuthState] = useState<
    "loading" | "needs_login" | "forbidden" | "ready"
  >("loading");

  useEffect(() => {
    if (!isLoggedIn()) {
      setAuthState("needs_login");
      return;
    }
    if (inquiry.isPublished) {
      // 既に公開済み → 編集できない
      setAuthState("forbidden");
      return;
    }
    const p = getProfile();
    if (!p) {
      setAuthState("needs_login");
      return;
    }
    p.then((profile) => {
      const uid = profile?.userId;
      if (!uid) {
        setAuthState("needs_login");
        return;
      }
      if (uid !== inquiry.lineUserId) {
        setAuthState("forbidden");
        return;
      }
      setAuthState("ready");
    }).catch(() => setAuthState("needs_login"));
  }, [inquiry]);

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
        この投稿は編集できません。
        <br />
        {inquiry.isPublished
          ? "(公開済みのため編集不可)"
          : "(本人以外は編集不可)"}
        <br />
        <Link
          href={`/inquiries/${inquiry.id}`}
          className="underline text-red-700"
        >
          ← 投稿に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <InquiryForm initial={inquiry} />
    </div>
  );
}
