import Link from "next/link";
import type { Circulation } from "@/types";

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

// 回覧板の一覧カード: 先頭の写真をサムネとして表示し、タイトルと日付を添える。
export default function CirculationCard({
  circulation,
}: {
  circulation: Circulation;
}) {
  const thumb = circulation.imageUrls[0];
  const extra = circulation.imageUrls.length - 1;
  return (
    <Link
      href={`/circulation/${circulation.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
    >
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
        <p className="text-xs text-gray-400">{formatDate(circulation.createdAt)}</p>
      </div>
    </Link>
  );
}
