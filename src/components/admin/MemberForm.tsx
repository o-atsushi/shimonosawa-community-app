"use client";

import { useState } from "react";
import { MEMBER_ROLE_LABELS } from "@/types";
import type { Member, MemberInput, MemberRole } from "@/types";

const ROLES: MemberRole[] = ["member", "associate"];

// 会員追加 / 編集フォーム。
// initial が渡されたら編集モード (PATCH)、そうでなければ新規 (POST)。
export default function MemberForm({
  lineUserId,
  initial,
  onSaved,
  onCancel,
}: {
  lineUserId: string;
  initial?: Member;
  onSaved: (member: Member) => void;
  onCancel?: () => void;
}) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [role, setRole] = useState<MemberRole>(initial?.role ?? "member");
  const [memberLineUserId, setMemberLineUserId] = useState(
    initial?.lineUserId ?? ""
  );
  const [household, setHousehold] = useState(initial?.household ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [joinedAt, setJoinedAt] = useState(initial?.joinedAt ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const input: MemberInput = {
      displayName: displayName.trim(),
      role,
      lineUserId: memberLineUserId.trim() || null,
      household: household.trim() || null,
      notes: notes.trim() || null,
      isAdmin,
      joinedAt: joinedAt || null,
    };
    try {
      const res = await fetch(
        initial ? `/api/admin/members/${initial.id}` : "/api/admin/members",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId, input }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      const data = await res.json();
      onSaved(data.member as Member);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4"
    >
      <h3 className="text-base font-bold text-gray-800">
        {initial ? "会員情報を編集" : "会員を追加"}
      </h3>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          氏名 (必須)
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          会員種別 (必須)
        </label>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <label
              key={r}
              className={`flex-1 text-center text-xs py-2 rounded-lg border cursor-pointer transition-colors ${
                role === r
                  ? "bg-green-600 text-white border-green-600 font-bold"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="sr-only"
              />
              {MEMBER_ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          入会日 (任意)
          <span className="text-gray-400 font-normal ml-1">
            年度途中入会の月割計算に使われます
          </span>
        </label>
        <input
          type="date"
          value={joinedAt}
          onChange={(e) => setJoinedAt(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          世帯情報 (任意)
        </label>
        <input
          type="text"
          value={household}
          onChange={(e) => setHousehold(e.target.value)}
          maxLength={100}
          placeholder="例: 山田太郎世帯 / 1-2-3"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          LINE userId (任意)
          <span className="text-gray-400 font-normal ml-1">
            U で始まる 33 文字
          </span>
        </label>
        <input
          type="text"
          value={memberLineUserId}
          onChange={(e) => setMemberLineUserId(e.target.value)}
          maxLength={64}
          placeholder="U..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">
          住民の自己リンク機能で自動入力される予定 (現状は手動)
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          備考 (任意)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="accent-green-600"
        />
        役員 (役員ダッシュボードにアクセスできるようにする)
      </label>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm"
        >
          {submitting ? "保存中..." : initial ? "更新する" : "追加する"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
