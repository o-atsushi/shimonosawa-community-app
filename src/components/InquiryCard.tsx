import Link from "next/link";
import type { Inquiry } from "@/types";
import {
  INQUIRY_CATEGORY_COLORS,
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_KIND_COLORS,
  INQUIRY_KIND_LABELS,
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_LABELS,
} from "@/lib/inquiries";
import InquiryLikeButton from "@/components/InquiryLikeButton";

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

// likeCount はサーバーで集計済みの値。クライアントマウント後に
// LikeButton 自身が自分のいいね状態 (liked/unliked) を取得する。
export default function InquiryCard({
  inquiry,
  likeCount = 0,
}: {
  inquiry: Inquiry;
  likeCount?: number;
}) {
  return (
    <Link
      href={`/inquiries/${inquiry.id}`}
      className="block rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${INQUIRY_KIND_COLORS[inquiry.kind]}`}
        >
          {INQUIRY_KIND_LABELS[inquiry.kind]}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${INQUIRY_CATEGORY_COLORS[inquiry.category]}`}
        >
          {INQUIRY_CATEGORY_LABELS[inquiry.category]}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${INQUIRY_STATUS_COLORS[inquiry.status]}`}
        >
          {INQUIRY_STATUS_LABELS[inquiry.status]}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {formatDate(inquiry.createdAt)}
        </span>
      </div>
      <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1">
        {inquiry.title}
      </h3>
      <p className="text-xs text-gray-500 line-clamp-2">{inquiry.body}</p>
      <div className="flex items-center justify-between mt-3 gap-2">
        {inquiry.response ? (
          <p className="text-xs text-green-700 flex items-center gap-1">
            <span>✓</span>
            <span>{inquiry.response.respondedBy}より回答済み</span>
          </p>
        ) : (
          <span />
        )}
        <InquiryLikeButton
          inquiryId={inquiry.id}
          initialCount={likeCount}
          insideLink
        />
      </div>
    </Link>
  );
}
