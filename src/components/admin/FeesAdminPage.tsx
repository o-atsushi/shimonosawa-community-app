"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MEMBER_ROLE_LABELS,
  type FeeSchedule,
  type MemberRole,
} from "@/types";
import AdminGate from "@/components/admin/AdminGate";

const ROLES: MemberRole[] = ["member", "associate"];

function currentFiscalYear(now: Date = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

function FeesBody({ lineUserId }: { lineUserId: string }) {
  const [fees, setFees] = useState<FeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(currentFiscalYear());
  const [amounts, setAmounts] = useState<Record<MemberRole, string>>({
    member: "",
    associate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const res = await fetch(
      `/api/admin/fees?lineUserId=${encodeURIComponent(lineUserId)}`
    );
    if (res.ok) {
      const data = await res.json();
      setFees(data.fees ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineUserId]);

  // 表示年度に対応する金額をフォームに反映
  useEffect(() => {
    const map: Record<MemberRole, string> = { member: "", associate: "" };
    for (const f of fees) {
      if (f.fiscalYear === year) {
        map[f.role] = String(f.amount);
      }
    }
    setAmounts(map);
  }, [fees, year]);

  async function handleSubmit(role: MemberRole) {
    const raw = amounts[role];
    const amount = parseInt(raw, 10);
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage("金額が不正です");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId,
          input: { fiscalYear: year, role, amount },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "保存に失敗しました");
      } else {
        setMessage(`${MEMBER_ROLE_LABELS[role]} の金額を保存しました`);
        await reload();
      }
    } catch {
      setMessage("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/members"
        className="text-green-600 text-sm hover:underline inline-block"
      >
        ← 会員一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800">💰 会費表</h1>
      <p className="text-xs text-gray-500">
        年度・会員種別ごとの会費標準額を設定します。住民の入金状況サマリ計算に使われます。
      </p>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            年度
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            min={2000}
            max={3000}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {ROLES.map((role) => (
          <div key={role} className="border-t border-gray-100 pt-3">
            <p className="text-sm font-bold text-gray-800 mb-1">
              {MEMBER_ROLE_LABELS[role]}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">¥</span>
              <input
                type="number"
                value={amounts[role]}
                onChange={(e) =>
                  setAmounts((prev) => ({ ...prev, [role]: e.target.value }))
                }
                min={0}
                step={100}
                placeholder="例: 12000"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => handleSubmit(role)}
                disabled={submitting}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg"
              >
                保存
              </button>
            </div>
          </div>
        ))}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg p-2">
            {message}
          </div>
        )}
      </div>

      <section>
        <h2 className="text-sm font-bold text-gray-800 mb-2">登録済みの会費表</h2>
        {fees.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-sm text-gray-500 border border-gray-100">
            まだ登録されていません。
          </div>
        ) : (
          <ul className="space-y-1">
            {fees.map((f) => (
              <li
                key={f.id}
                className="bg-white rounded-lg p-3 border border-gray-100 text-sm flex items-center gap-2"
              >
                <span className="text-gray-500 font-mono text-xs">
                  {f.fiscalYear}年度
                </span>
                <span className="font-bold">{MEMBER_ROLE_LABELS[f.role]}</span>
                <span className="ml-auto font-bold">
                  ¥{f.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function FeesAdminPage() {
  return (
    <AdminGate>{({ lineUserId }) => <FeesBody lineUserId={lineUserId} />}</AdminGate>
  );
}
