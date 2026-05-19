"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MEMBER_ROLE_COLORS,
  MEMBER_ROLE_LABELS,
  type FeeSchedule,
  type Member,
  type Payment,
} from "@/types";
import AdminGate from "@/components/admin/AdminGate";
import MemberForm from "@/components/admin/MemberForm";

// 現在の年度: 4月始まり想定 (4月以降は当年、3月以前は前年)
function currentFiscalYear(now: Date = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

// 年度途中入会の月割計算 (auth.ts と同じロジック)
function monthsInFiscalYear(
  fiscalYear: number,
  joinedAt: string | null | undefined
): number {
  const fyStart = new Date(fiscalYear, 3, 1);
  const nextFyStart = new Date(fiscalYear + 1, 3, 1);
  if (!joinedAt) return 12;
  const joined = new Date(joinedAt);
  if (Number.isNaN(joined.getTime())) return 12;
  if (joined < fyStart) return 12;
  if (joined >= nextFyStart) return 0;
  const joinedMonth = joined.getMonth() + 1;
  return joinedMonth >= 4 ? 16 - joinedMonth : 4 - joinedMonth;
}

function expectedAmount(
  annualAmount: number,
  fiscalYear: number,
  joinedAt: string | null | undefined
): number {
  if (annualAmount <= 0) return 0;
  const months = monthsInFiscalYear(fiscalYear, joinedAt);
  if (months <= 0) return 0;
  if (months >= 12) return annualAmount;
  return Math.ceil((annualAmount * months) / 12);
}

interface MemberSummary {
  member: Member;
  paidThisYear: number;
  expectedThisYear: number | null;
  status: "paid" | "partial" | "unpaid";
}

function STATUS_BADGE(status: MemberSummary["status"]): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800";
    case "partial":
      return "bg-amber-100 text-amber-800";
    case "unpaid":
      return "bg-gray-200 text-gray-700";
  }
}

function STATUS_LABEL(status: MemberSummary["status"]): string {
  switch (status) {
    case "paid":
      return "完納";
    case "partial":
      return "一部";
    case "unpaid":
      return "未納";
  }
}

function buildSummary(
  members: Member[],
  fees: FeeSchedule[],
  payments: Payment[],
  fiscalYear: number
): MemberSummary[] {
  const feeByRole = new Map<string, number>();
  for (const f of fees) {
    if (f.fiscalYear === fiscalYear) feeByRole.set(f.role, f.amount);
  }
  const paidByMember = new Map<string, number>();
  for (const p of payments) {
    if (p.fiscalYear !== fiscalYear) continue;
    paidByMember.set(p.memberId, (paidByMember.get(p.memberId) ?? 0) + p.amount);
  }
  return members.map((m) => {
    // 準会員は管理会社一括徴収のため、個別の入金管理はしない
    if (m.role === "associate") {
      return { member: m, paidThisYear: 0, expectedThisYear: null, status: "paid" as const };
    }
    const paid = paidByMember.get(m.id) ?? 0;
    const annual = feeByRole.get(m.role);
    // 年度途中入会の場合は月割で期待額を計算
    const expected =
      annual != null ? expectedAmount(annual, fiscalYear, m.joinedAt) : null;
    let status: MemberSummary["status"] = "unpaid";
    if (expected != null) {
      if (paid >= expected) status = "paid";
      else if (paid > 0) status = "partial";
      else status = "unpaid";
    } else if (paid > 0) {
      status = "partial";
    }
    return { member: m, paidThisYear: paid, expectedThisYear: expected, status };
  });
}

interface FetchAllResult {
  members: Member[];
  fees: FeeSchedule[];
  payments: Payment[];
}

async function fetchAll(lineUserId: string): Promise<FetchAllResult> {
  // 1リクエストで済むよう実装したいが、現状は別エンドポイント。並列で呼ぶ。
  const [mRes, fRes, pRes] = await Promise.all([
    fetch(`/api/admin/members?lineUserId=${encodeURIComponent(lineUserId)}`),
    fetch(`/api/admin/fees?lineUserId=${encodeURIComponent(lineUserId)}`),
    fetch(`/api/admin/payments?lineUserId=${encodeURIComponent(lineUserId)}`),
  ]);
  // 一覧 API は別途実装中 (今回は POST/PATCH/DELETE のみなので GET 用にエンドポイント追加)
  const mJson = mRes.ok ? await mRes.json() : { members: [] };
  const fJson = fRes.ok ? await fRes.json() : { fees: [] };
  const pJson = pRes.ok ? await pRes.json() : { payments: [] };
  return {
    members: mJson.members ?? [],
    fees: fJson.fees ?? [],
    payments: pJson.payments ?? [],
  };
}

function MembersBody({ lineUserId }: { lineUserId: string }) {
  const fiscalYear = currentFiscalYear();
  const [members, setMembers] = useState<Member[]>([]);
  const [fees, setFees] = useState<FeeSchedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);

  async function reload() {
    setLoading(true);
    const result = await fetchAll(lineUserId);
    setMembers(result.members);
    setFees(result.fees);
    setPayments(result.payments);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineUserId]);

  const summary = buildSummary(members, fees, payments, fiscalYear);
  const counts = {
    total: summary.length,
    paid: summary.filter((s) => s.status === "paid").length,
    partial: summary.filter((s) => s.status === "partial").length,
    unpaid: summary.filter((s) => s.status === "unpaid").length,
  };
  const totalPaid = summary.reduce((sum, s) => sum + s.paidThisYear, 0);

  if (loading) {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-800">👥 会員管理</h1>
        <div className="flex gap-2 text-xs">
          <Link
            href="/admin/fees"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            会費表 →
          </Link>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-2">
          {fiscalYear} 年度の状況
        </p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-600">総数</p>
            <p className="text-xl font-bold">{counts.total}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-700">完納</p>
            <p className="text-xl font-bold text-emerald-700">{counts.paid}</p>
          </div>
          <div>
            <p className="text-xs text-amber-700">一部</p>
            <p className="text-xl font-bold text-amber-700">{counts.partial}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">未納</p>
            <p className="text-xl font-bold text-gray-700">{counts.unpaid}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3 text-right">
          入金合計: <span className="font-bold">¥{totalPaid.toLocaleString()}</span>
        </p>
      </div>

      {!adding && !editing && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-sm"
        >
          ＋ 会員を追加
        </button>
      )}

      {adding && (
        <MemberForm
          lineUserId={lineUserId}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {editing && (
        <MemberForm
          lineUserId={lineUserId}
          initial={editing}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="space-y-2">
        {summary.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
            まだ会員が登録されていません。
          </div>
        ) : (
          summary.map((s) => (
            <div
              key={s.member.id}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs text-gray-400 font-mono">
                  #{s.member.memberNumber}
                </span>
                <span className="font-bold text-gray-800 text-sm">
                  {s.member.displayName}
                </span>
                {s.member.isAdmin && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                    役員
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEMBER_ROLE_COLORS[s.member.role]}`}
                >
                  {MEMBER_ROLE_LABELS[s.member.role]}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${STATUS_BADGE(s.status)}`}
                >
                  {STATUS_LABEL(s.status)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {s.member.role === "associate" ? (
                    <span className="text-gray-400">管理会社一括徴収</span>
                  ) : (
                    <>
                      {fiscalYear}年度: ¥{s.paidThisYear.toLocaleString()}
                      {s.expectedThisYear != null && (
                        <span className="text-gray-400">
                          {" "}/ ¥{s.expectedThisYear.toLocaleString()}
                        </span>
                      )}
                    </>
                  )}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/members/${s.member.id}`}
                    className="text-green-600 hover:underline"
                  >
                    詳細
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditing(s.member)}
                    className="text-blue-600 hover:underline"
                  >
                    編集
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MembersAdminPage() {
  return (
    <AdminGate>
      {({ lineUserId }) => <MembersBody lineUserId={lineUserId} />}
    </AdminGate>
  );
}
