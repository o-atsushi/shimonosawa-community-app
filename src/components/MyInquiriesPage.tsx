"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isLoggedIn } from "@/lib/liff";
import {
  INQUIRY_CATEGORY_COLORS,
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_KIND_COLORS,
  INQUIRY_KIND_LABELS,
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_LABELS,
} from "@/lib/inquiries";
import type { Inquiry } from "@/types";

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

// 投稿者本人の「自分の投稿」一覧。
// 未公開 / 公開中 / 役員からの回答有無 を一目で分かるバッジ付きで表示。
export default function MyInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [status, setStatus] = useState<"loading" | "needs_login" | "ready" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setStatus("needs_login");
      return;
    }
    const p = getProfile();
    if (!p) {
      setStatus("needs_login");
      return;
    }
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) {
        setStatus("needs_login");
        return;
      }
      try {
        const res = await fetch("/api/inquiries/mine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: uid }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErrorMsg(
            (d.error ?? "取得に失敗しました") +
              (d.detail ? `\n詳細: ${d.detail}` : "")
          );
          setStatus("error");
          return;
        }
        const data: { inquiries: Inquiry[] } = await res.json();
        setInquiries(data.inquiries ?? []);
        setStatus("ready");
      } catch (err) {
        console.error("[MyInquiriesPage] fetch failed", err);
        setErrorMsg("通信エラーが発生しました");
        setStatus("error");
      }
    }).catch(() => setStatus("needs_login"));
  }, []);

  if (status === "loading") {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }
  if (status === "needs_login") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        LINE 経由でアプリを開いてください。
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 whitespace-pre-wrap">
        {errorMsg ?? "エラーが発生しました"}
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/inquiries"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← ご意見・要望一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-2">
        📝 自分の投稿
      </h1>
      <p className="text-xs text-gray-500 mb-4">
        あなたが投稿した質問・要望の一覧です。
        役員の確認待ち (未公開) のものは <b>編集 / 取消</b> もできます。
      </p>

      {inquiries.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ投稿はありません。
          <br />
          <Link
            href="/inquiries/new"
            className="text-green-600 font-bold hover:underline text-xs mt-2 inline-block"
          >
            ＋ 新規投稿する
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inq) => {
            const hasResponse = !!inq.response;
            return (
              <Link
                key={inq.id}
                href={`/inquiries/${inq.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${INQUIRY_KIND_COLORS[inq.kind]}`}
                  >
                    {INQUIRY_KIND_LABELS[inq.kind]}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${INQUIRY_CATEGORY_COLORS[inq.category]}`}
                  >
                    {INQUIRY_CATEGORY_LABELS[inq.category]}
                  </span>
                  {inq.isPublished ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      🌐 公開中
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      🔒 確認中
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${INQUIRY_STATUS_COLORS[inq.status]}`}
                  >
                    {INQUIRY_STATUS_LABELS[inq.status]}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDate(inq.createdAt)}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-gray-800 leading-snug">
                  {inq.title}
                </h3>
                {hasResponse && (
                  <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                    <span>✓</span>
                    <span>役員から回答済み</span>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
