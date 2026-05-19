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
import PaymentForm from "@/components/admin/PaymentForm";

function currentFiscalYear(now: Date = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

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

interface MemberDetailData {
  member: Member;
  payments: Payment[];
  fees: FeeSchedule[];
}

async function fetchMemberDetail(
  lineUserId: string,
  id: string
): Promise<MemberDetailData | null> {
  const [mRes, pRes, fRes] = await Promise.all([
    fetch(`/api/admin/members?lineUserId=${encodeURIComponent(lineUserId)}`),
    fetch(`/api/admin/payments?lineUserId=${encodeURIComponent(lineUserId)}`),
    fetch(`/api/admin/fees?lineUserId=${encodeURIComponent(lineUserId)}`),
  ]);
  if (!mRes.ok) return null;
  const mJson = await mRes.json();
  const pJson = pRes.ok ? await pRes.json() : { payments: [] };
  const fJson = fRes.ok ? await fRes.json() : { fees: [] };
  const all: Member[] = mJson.members ?? [];
  const member = all.find((m) => m.id === id);
  if (!member) return null;
  const memberPayments: Payment[] = (pJson.payments ?? []).filter(
    (p: Payment) => p.memberId === id
  );
  return {
    member,
    payments: memberPayments,
    fees: fJson.fees ?? [],
  };
}

function DetailBody({ lineUserId, id }: { lineUserId: string; id: string }) {
  const fiscalYear = currentFiscalYear();
  const [data, setData] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);

  async function reload() {
    setLoading(true);
    const result = await fetchMemberDetail(lineUserId, id);
    if (!result) {
      setNotFound(true);
    } else {
      setData(result);
      setNotFound(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineUserId, id]);

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("この入金記録を削除しますか?")) return;
    const res = await fetch(`/api/admin/payments/${paymentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUserId, memberId: id }),
    });
    if (res.ok) reload();
  }

  async function handleDeleteMember() {
    if (!data) return;
    if (!confirm(`「${data.member.displayName}」を削除しますか? 入金記録も削除されます。`)) return;
    const res = await fetch(`/api/admin/members/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUserId }),
    });
    if (res.ok) {
      window.location.href = "/admin/members";
    } else {
      const r = await res.json().catch(() => ({}));
      alert(r.error ?? "削除に失敗しました");
    }
  }

  if (loading) return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  if (notFound) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p className="text-sm text-red-700 mb-2">会員が見つかりません。</p>
      <Link href="/admin/members" className="text-green-600 text-sm hover:underline">
        ← 会員一覧に戻る
      </Link>
    </div>
  );
  if (!data) return null;

  const { member, payments, fees } = data;
  const paidThisYear = payments
    .filter((p) => p.fiscalYear === fiscalYear)
    .reduce((s, p) => s + p.amount, 0);
  // 年額 (会費表から)
  const annualThisYear =
    fees.find((f) => f.fiscalYear === fiscalYear && f.role === member.role)?.amount ??
    null;
  // 月割計算: 入会日が当年度途中なら月数 / 12 で按分
  const months = monthsInFiscalYear(fiscalYear, member.joinedAt);
  const feeThisYear =
    annualThisYear != null
      ? months >= 12
        ? annualThisYear
        : Math.ceil((annualThisYear * months) / 12)
      : null;
  const isProrated = annualThisYear != null && months < 12 && months > 0;
  // 年度ごとの履歴をグルーピング
  const byYear = new Map<number, Payment[]>();
  for (const p of payments) {
    const arr = byYear.get(p.fiscalYear) ?? [];
    arr.push(p);
    byYear.set(p.fiscalYear, arr);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/members"
        className="text-green-600 text-sm hover:underline inline-block"
      >
        ← 会員一覧に戻る
      </Link>

      <article className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-gray-400 font-mono">
            #{member.memberNumber}
          </span>
          <h1 className="text-lg font-bold text-gray-800">{member.displayName}</h1>
          {member.isAdmin && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
              役員
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEMBER_ROLE_COLORS[member.role]}`}
          >
            {MEMBER_ROLE_LABELS[member.role]}
          </span>
        </div>
        {member.household && (
          <p className="text-xs text-gray-600 mb-1">世帯: {member.household}</p>
        )}
        {member.notes && (
          <p className="text-xs text-gray-600 mb-1 whitespace-pre-wrap">
            備考: {member.notes}
          </p>
        )}
        {member.lineUserId && (
          <p className="text-xs text-gray-400 mb-1 font-mono">
            LINE: {member.lineUserId.slice(0, 8)}...
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            編集
          </button>
          <button
            type="button"
            onClick={handleDeleteMember}
            className="text-xs px-3 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            削除
          </button>
        </div>
      </article>

      {editing && (
        <MemberForm
          lineUserId={lineUserId}
          initial={member}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {member.role === "associate" ? (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-900">
          準会員は <strong>管理会社による一括徴収</strong> のため、個別の入金管理は不要です。
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-gray-600 mb-1">{fiscalYear} 年度の納付状況</p>
            <p className="text-2xl font-bold text-gray-800">
              ¥{paidThisYear.toLocaleString()}
              {feeThisYear != null && (
                <span className="text-base text-gray-400 font-normal ml-2">
                  / ¥{feeThisYear.toLocaleString()}
                </span>
              )}
            </p>
            {isProrated && (
              <p className="text-xs text-amber-700 mt-1">
                月割: 年額 ¥{annualThisYear!.toLocaleString()} × {months}/12
                ヶ月 (入会日: {member.joinedAt})
              </p>
            )}
          </div>

          {!addingPayment ? (
            <button
              type="button"
              onClick={() => setAddingPayment(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-sm"
            >
              ＋ 入金を記録
            </button>
          ) : (
            <PaymentForm
              lineUserId={lineUserId}
              memberId={member.id}
              defaultFiscalYear={fiscalYear}
              defaultAmount={feeThisYear ?? undefined}
              onSaved={() => reload()}
              onCancel={() => setAddingPayment(false)}
            />
          )}
        </>
      )}

      <section>
        <h2 className="text-sm font-bold text-gray-800 mb-2">入金履歴</h2>
        {years.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-sm text-gray-500 border border-gray-100">
            まだ入金記録はありません。
          </div>
        ) : (
          years.map((year) => {
            const list = byYear.get(year) ?? [];
            const yearTotal = list.reduce((s, p) => s + p.amount, 0);
            return (
              <div key={year} className="mb-3">
                <p className="text-xs font-bold text-gray-700 mb-1">
                  {year}年度 (¥{yearTotal.toLocaleString()})
                </p>
                <ul className="space-y-1">
                  {list.map((p) => (
                    <li
                      key={p.id}
                      className="bg-white rounded-lg p-3 border border-gray-100 flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">
                          ¥{p.amount.toLocaleString()}
                          {p.method && (
                            <span className="text-xs text-gray-500 font-normal ml-2">
                              ({p.method})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{p.paidAt}</p>
                        {p.notes && (
                          <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                            {p.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

export default function MemberDetailAdminPage({ id }: { id: string }) {
  return (
    <AdminGate>
      {({ lineUserId }) => <DetailBody lineUserId={lineUserId} id={id} />}
    </AdminGate>
  );
}
