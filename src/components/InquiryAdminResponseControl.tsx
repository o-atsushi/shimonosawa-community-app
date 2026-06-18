"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import {
  INQUIRY_STATUS_LABELS,
} from "@/lib/inquiries";
import type { Inquiry, InquiryStatus } from "@/types";

const BODY_MAX = 2000;
const RESPONDED_BY_MAX = 50;
const STATUS_OPTIONS: InquiryStatus[] = ["pending", "in_progress", "answered"];

// 詳細ページに置く役員専用の操作パネル。
// - 回答の入力 / 編集 / 取り消し
// - ステータス (受付中 / 対応中 / 回答済み) の変更
// それぞれ独立しているので、回答だけ入力してステータスは pending のまま、
// 逆にステータスだけ in_progress にする、なども可能。
//
// is_admin 判定が成立した役員にのみ表示される。
export default function InquiryAdminResponseControl({
  inquiry,
}: {
  inquiry: Inquiry;
}) {
  const router = useRouter();
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  // 入力 state (初期値は既存の値)
  const [responseBody, setResponseBody] = useState(
    inquiry.response?.body ?? ""
  );
  const [respondedBy, setRespondedBy] = useState(
    inquiry.response?.respondedBy ?? "自治会"
  );
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status);

  const [savingResponse, setSavingResponse] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResponse = useMemo(
    () => !!inquiry.response && inquiry.response.body.length > 0,
    [inquiry.response]
  );

  useEffect(() => {
    if (!isLoggedIn()) return;
    const p = getProfile();
    if (!p) return;
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) return;
      setLineUserId(uid);
      try {
        const res = await fetch(
          `/api/members/me?lineUserId=${encodeURIComponent(uid)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.member?.isAdmin) setIsAdmin(true);
      } catch {
        // ignore
      }
    }).catch(() => {});
  }, []);

  if (!isAdmin || !lineUserId) return null;

  async function handleSaveResponse() {
    setError(null);
    if (
      responseBody.trim().length === 0 ||
      responseBody.length > BODY_MAX
    ) {
      setError(`回答本文を 1〜${BODY_MAX} 文字で入力してください`);
      return;
    }
    if (
      respondedBy.trim().length === 0 ||
      respondedBy.length > RESPONDED_BY_MAX
    ) {
      setError(`回答者名を 1〜${RESPONDED_BY_MAX} 文字で入力してください`);
      return;
    }
    setSavingResponse(true);
    try {
      const res = await fetch(
        `/api/admin/inquiries/${inquiry.id}/response`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responseBody: responseBody.trim(),
            respondedBy: respondedBy.trim(),
            lineUserId,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "回答の保存に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSavingResponse(false);
    }
  }

  async function handleClearResponse() {
    if (!window.confirm("この回答を取り消しますか?")) return;
    setError(null);
    setSavingResponse(true);
    try {
      const res = await fetch(
        `/api/admin/inquiries/${inquiry.id}/response`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "回答の取り消しに失敗しました");
        return;
      }
      setResponseBody("");
      setRespondedBy("自治会");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSavingResponse(false);
    }
  }

  async function handleSaveStatus() {
    setError(null);
    setSavingStatus(true);
    try {
      const res = await fetch(
        `/api/admin/inquiries/${inquiry.id}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, lineUserId }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "ステータスの更新に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSavingStatus(false);
    }
  }

  const statusUnchanged = status === inquiry.status;

  return (
    <section className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
      <h2 className="text-sm font-bold text-purple-900 mb-3">
        🛡️ 役員専用: 回答とステータスを更新
      </h2>

      {/* ステータス変更 */}
      <div className="bg-white rounded-lg p-3 mb-3 border border-purple-100">
        <label className="block text-xs font-bold text-gray-700 mb-2">
          ステータス
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InquiryStatus)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {INQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSaveStatus}
            disabled={statusUnchanged || savingStatus}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
          >
            {savingStatus ? "更新中..." : "ステータスを保存"}
          </button>
        </div>
      </div>

      {/* 回答入力 */}
      <div className="bg-white rounded-lg p-3 border border-purple-100">
        <label className="block text-xs font-bold text-gray-700 mb-2">
          回答 {hasResponse && "(編集中)"}
        </label>
        <input
          type="text"
          value={respondedBy}
          onChange={(e) => setRespondedBy(e.target.value)}
          maxLength={RESPONDED_BY_MAX}
          placeholder="回答者名 (例: 自治会)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
        />
        <textarea
          value={responseBody}
          onChange={(e) => setResponseBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={5}
          placeholder="住民への回答本文を入力してください"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
        />
        <div className="text-right text-xs text-gray-400 mt-0.5 mb-2">
          {responseBody.length} / {BODY_MAX}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasResponse && (
            <button
              type="button"
              onClick={handleClearResponse}
              disabled={savingResponse}
              className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
            >
              🗑 回答を取り消す
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveResponse}
            disabled={savingResponse}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white"
          >
            {savingResponse
              ? "保存中..."
              : hasResponse
                ? "回答を更新"
                : "回答を保存"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-700 mt-2 whitespace-pre-wrap">
          {error}
        </p>
      )}

      <p className="text-xs text-purple-700 mt-3">
        💡 回答とステータスは独立しています。ステータスだけ「対応中」にして回答は後で、というような使い方も OK です。
      </p>
    </section>
  );
}
