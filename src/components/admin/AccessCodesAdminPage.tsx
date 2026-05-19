"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import type { AccessCode } from "@/types";

function Body({ lineUserId }: { lineUserId: string }) {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const res = await fetch(
      `/api/admin/access-codes?lineUserId=${encodeURIComponent(lineUserId)}`
    );
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineUserId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId,
          input: {
            code: code.trim(),
            description: description.trim() || null,
            validUntil: validUntil || null,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "追加に失敗しました");
        return;
      }
      setCode("");
      setDescription("");
      setValidUntil("");
      await reload();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このアクセスコードを削除しますか?")) return;
    const res = await fetch(`/api/admin/access-codes/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUserId }),
    });
    if (res.ok) reload();
  }

  if (loading) {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="text-green-600 text-sm hover:underline inline-block"
      >
        ← 管理画面に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800">🔑 アクセスコード</h1>
      <p className="text-xs text-gray-500">
        準会員 (賃貸マンション居住者) の初回ログイン時に必要なコードです。
        コードを管理会社経由で配布してください。
      </p>

      <form
        onSubmit={handleAdd}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3"
      >
        <h3 className="text-sm font-bold text-gray-800">コードを追加</h3>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            コード (必須、50文字以内)
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={50}
            required
            placeholder="例: SHIMONOSAWA2026"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            説明 (任意)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            placeholder="例: ABCマンション 2026年度"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            有効期限 (任意、未設定=無期限)
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm"
        >
          {submitting ? "追加中..." : "追加する"}
        </button>
      </form>

      <section>
        <h2 className="text-sm font-bold text-gray-800 mb-2">登録済みコード</h2>
        {codes.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-sm text-gray-500 border border-gray-100">
            まだ登録されていません。
          </div>
        ) : (
          <ul className="space-y-2">
            {codes.map((c) => {
              const expired =
                c.validUntil &&
                Date.now() > new Date(c.validUntil + "T23:59:59").getTime();
              return (
                <li
                  key={c.id}
                  className="bg-white rounded-lg p-3 border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono font-bold text-sm">{c.code}</span>
                    {expired && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        期限切れ
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-red-600 hover:underline ml-auto"
                    >
                      削除
                    </button>
                  </div>
                  {c.description && (
                    <p className="text-xs text-gray-600">{c.description}</p>
                  )}
                  {c.validUntil && (
                    <p className="text-xs text-gray-400">
                      有効期限: {c.validUntil}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AccessCodesAdminPage() {
  return (
    <AdminGate>{({ lineUserId }) => <Body lineUserId={lineUserId} />}</AdminGate>
  );
}
