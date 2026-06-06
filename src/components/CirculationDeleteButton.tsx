"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";

// 役員のみに「削除」ボタンを表示するクライアントコンポーネント。
// 押下 → 確認 → DELETE /api/circulations/[id] → 一覧に戻る。
export default function CirculationDeleteButton({
  circulationId,
}: {
  circulationId: string;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [lineUserId, setLineUserId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

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

  async function handleDelete() {
    if (!window.confirm("この回覧板を削除しますか?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/circulations/${circulationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "削除に失敗しました");
        return;
      }
      router.push("/circulation");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={submitting}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {submitting ? "削除中..." : "🗑 この回覧板を削除"}
    </button>
  );
}
