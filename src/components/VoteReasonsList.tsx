import type { VoteReasonItem } from "@/types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

// 投票理由を選択肢ごとにグルーピングして匿名で表示する。
// reason が空のレコードは取得時点で除外されている前提。
export default function VoteReasonsList({
  reasons,
}: {
  reasons: VoteReasonItem[];
}) {
  if (reasons.length === 0) return null;

  // 選択肢ごとにグルーピング (出現順を維持)
  const groups = new Map<string, VoteReasonItem[]>();
  for (const r of reasons) {
    const arr = groups.get(r.option) ?? [];
    arr.push(r);
    groups.set(r.option, arr);
  }

  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="text-base font-bold text-gray-800 mb-3">
        💭 投票者からの声
      </h2>
      <div className="space-y-4">
        {Array.from(groups.entries()).map(([option, items]) => (
          <div key={option}>
            <p className="text-xs font-bold text-gray-700 mb-2">
              「{option}」 ({items.length}件)
            </p>
            <ul className="space-y-2">
              {items.map((r, idx) => (
                <li
                  key={`${option}-${idx}`}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                >
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {r.reason}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    自治会員 · {formatDateTime(r.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
