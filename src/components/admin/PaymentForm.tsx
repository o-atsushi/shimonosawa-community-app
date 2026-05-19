"use client";

import { useState } from "react";
import type { Payment } from "@/types";

// 入金記録の追加フォーム (member 詳細画面内で使う想定)
export default function PaymentForm({
  lineUserId,
  memberId,
  defaultFiscalYear,
  defaultAmount,
  onSaved,
  onCancel,
}: {
  lineUserId: string;
  memberId: string;
  defaultFiscalYear: number;
  defaultAmount?: number;
  onSaved: (payment: Payment) => void;
  onCancel?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [fiscalYear, setFiscalYear] = useState<number>(defaultFiscalYear);
  const [amount, setAmount] = useState<number>(defaultAmount ?? 0);
  const [paidAt, setPaidAt] = useState<string>(today);
  const [method, setMethod] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (amount < 0 || !Number.isFinite(amount)) {
      setError("金額が不正です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId,
          input: {
            memberId,
            fiscalYear,
            amount,
            paidAt,
            method: method.trim() || null,
            notes: notes.trim() || null,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      const data = await res.json();
      onSaved(data.payment as Payment);
      // フォームをリセット (連続入力対応)
      setAmount(0);
      setMethod("");
      setNotes("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3"
    >
      <h3 className="text-sm font-bold text-gray-800">入金を記録</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            年度
          </label>
          <input
            type="number"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
            min={2000}
            max={3000}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            金額 (円)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value, 10))}
            min={0}
            step={100}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          入金日
        </label>
        <input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          入金方法 (任意)
        </label>
        <input
          type="text"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          maxLength={50}
          placeholder="現金 / 振込 / PayPay など"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
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
          {submitting ? "登録中..." : "登録する"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
          >
            閉じる
          </button>
        )}
      </div>
    </form>
  );
}
