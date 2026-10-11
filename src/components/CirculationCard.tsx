import Link from "next/link";
import CirculationInterestButton from "@/components/CirculationInterestButton";
import { isNewCirculation } from "@/lib/circulations";
import type { Circulation } from "@/types";

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

// 回覧板の一覧カード: 先頭の写真をサムネとして表示し、タイトルと日付を添える。
// - 「🆕 新着」バッジは **投稿から 14 日以内 かつ 自分が未読** の時だけ表示。
//    - 既読になれば消える (= 詳細ページを開くと circulation_views に行が記録され次回以降は未表示)
//    - 未読のまま 14 日が経過しても消える (投稿日ベースの絶対カットオフ)
//    - 未ログインや fetch 前は isRead=false 扱いなので、少なくとも投稿から 14 日以内は見える
// - 興味あり数の表示 + ワンタップで ❤️ トグル (詳細ページを開かずに意思表示できる)
export default function CirculationCard({
  circulation,
  interestCount = 0,
  isRead = false,
}: {
  circulation: Circulation;
  interestCount?: number;
  isRead?: boolean;
}) {
  const thumb = circulation.imageUrls[0];
  const extra = circulation.imageUrls.length - 1;
  const isNew = isNewCirculation(circulation.createdAt) && !isRead;
  return (
    <Link
      href={`/circulation/${circulation.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden relative"
    >
      {isNew && (
        <span className="absolute top-1.5 left-1.5 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
          🆕 新着
        </span>
      )}
      {thumb && (
        <div className="relative bg-gray-100 aspect-[4/3] overflow-hidden">
          {/* next/image を使わず素の img タグで簡素化 (Supabase 配下のため最適化対象外) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt={circulation.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {extra > 0 && (
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              +{extra} 枚
            </span>
          )}
        </div>
      )}
      <div className="p-3">
        <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">
          {circulation.title}
        </h3>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs text-gray-400">
            {formatDate(circulation.createdAt)}
          </p>
          <CirculationInterestButton
            circulationId={circulation.id}
            initialCount={interestCount}
            variant="compact"
          />
        </div>
      </div>
    </Link>
  );
}
