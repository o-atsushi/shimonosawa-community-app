"use client";

import { useMemo, useState } from "react";
import CirculationCard from "@/components/CirculationCard";
import type { Circulation } from "@/types";

// 月キー: "2026-05" 形式
function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function monthLabel(key: string): string {
  if (key === "unknown") return "不明";
  const [y, m] = key.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

// 一覧 + 月絞り込み (クライアント側フィルタ)。
// items は新しい順で渡される前提 (lib/circulations.ts で created_at desc 済み)。
export default function CirculationList({ items }: { items: Circulation[] }) {
  // 月の選択肢を月キーで列挙 (重複除去 + 新しい順)
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const c of items) set.add(monthKey(c.createdAt));
    return Array.from(set).sort().reverse();
  }, [items]);

  const [selected, setSelected] = useState<string>(""); // "" = 全て

  const filtered = useMemo(() => {
    if (!selected) return items;
    return items.filter((c) => monthKey(c.createdAt) === selected);
  }, [items, selected]);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
        まだ回覧板は投稿されていません。
      </div>
    );
  }

  return (
    <>
      {/* 月フィルタ。投稿のあった月のみ選択肢に出す */}
      {months.length > 1 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <label
            htmlFor="month-filter"
            className="text-xs text-gray-600 font-bold"
          >
            月で絞り込み:
          </label>
          <select
            id="month-filter"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value="">すべて ({items.length}件)</option>
            {months.map((m) => {
              const count = items.filter(
                (c) => monthKey(c.createdAt) === m
              ).length;
              return (
                <option key={m} value={m}>
                  {monthLabel(m)} ({count}件)
                </option>
              );
            })}
          </select>
          {selected && (
            <button
              type="button"
              onClick={() => setSelected("")}
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
            >
              クリア
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          この月の回覧板はありません。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((c) => (
            <CirculationCard key={c.id} circulation={c} />
          ))}
        </div>
      )}
    </>
  );
}
