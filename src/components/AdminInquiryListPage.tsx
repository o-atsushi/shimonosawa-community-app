"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InquiryPublishToggleButton from "@/components/InquiryPublishToggleButton";
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

// 役員専用: 全要望/質問 (未公開含む) を一覧表示し、公開トグルを行える。
// クライアント側で LIFF userId 取得 → /api/admin/inquiries POST で
// is_admin 検証 + 一覧取得 → 表示。
export default function AdminInquiryListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [status, setStatus] = useState<
    "loading" | "needs_login" | "forbidden" | "ready" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unpublished" | "published">(
    "unpublished"
  );

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
      setLineUserId(uid);
      try {
        const res = await fetch("/api/admin/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: uid }),
        });
        if (res.status === 403) {
          setStatus("forbidden");
          return;
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErrorMsg(d.error ?? "一覧の取得に失敗しました");
          setStatus("error");
          return;
        }
        const data: { inquiries: Inquiry[] } = await res.json();
        setInquiries(data.inquiries ?? []);
        setStatus("ready");
      } catch (err) {
        console.error("[AdminInquiryListPage] fetch failed", err);
        setErrorMsg("通信エラーが発生しました");
        setStatus("error");
      }
    }).catch(() => setStatus("needs_login"));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "unpublished") return inquiries.filter((i) => !i.isPublished);
    if (filter === "published") return inquiries.filter((i) => i.isPublished);
    return inquiries;
  }, [inquiries, filter]);

  const counts = useMemo(
    () => ({
      all: inquiries.length,
      unpublished: inquiries.filter((i) => !i.isPublished).length,
      published: inquiries.filter((i) => i.isPublished).length,
    }),
    [inquiries]
  );

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
  if (status === "forbidden") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        このページは役員のみ閲覧できます。
        <br />
        <Link href="/inquiries" className="underline text-red-700">
          ← ご意見・要望一覧に戻る
        </Link>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
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

      <h1 className="text-lg font-bold text-gray-800 mb-2">
        🛡️ 公開設定 (役員専用)
      </h1>
      <p className="text-xs text-gray-500 mb-4">
        住民から投稿された要望/質問の公開状態を切り替えできます。
        新規投稿はデフォルト「🔒 非公開」になっており、役員がここで公開すると一覧に出るようになります。
      </p>

      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(
          [
            { key: "unpublished", label: `🔒 未公開 (${counts.unpublished})` },
            { key: "published", label: `🌐 公開中 (${counts.published})` },
            { key: "all", label: `すべて (${counts.all})` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`text-xs font-bold px-3 py-2 rounded-t-lg transition-colors ${
              filter === t.key
                ? "bg-green-100 text-green-800 border-b-2 border-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          該当する投稿はありません。
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inq) => (
            <article
              key={inq.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
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
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${INQUIRY_STATUS_COLORS[inq.status]}`}
                >
                  {INQUIRY_STATUS_LABELS[inq.status]}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatDate(inq.createdAt)}
                </span>
              </div>
              <Link
                href={`/inquiries/${inq.id}`}
                className="block mb-2 hover:underline"
              >
                <h3 className="font-bold text-sm text-gray-800 leading-snug">
                  {inq.title}
                </h3>
              </Link>
              <div className="flex items-center justify-end mt-2">
                {lineUserId && (
                  <InquiryPublishToggleButton
                    inquiryId={inq.id}
                    lineUserId={lineUserId}
                    isPublished={inq.isPublished}
                    onChanged={(next) => {
                      setInquiries((prev) =>
                        prev.map((p) =>
                          p.id === inq.id ? { ...p, isPublished: next } : p
                        )
                      );
                    }}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
