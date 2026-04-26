import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteOwnPostButton from "@/components/DeleteOwnPostButton";
import { getInquiry } from "@/lib/inquiries";
import {
  INQUIRY_CATEGORY_COLORS,
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_LABELS,
} from "@/lib/inquiries";

export const revalidate = 60;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(id);

  if (!inquiry) return notFound();

  return (
    <div>
      <Link
        href="/inquiries"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 掲示板に戻る
      </Link>

      {/* 投稿 */}
      <article className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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
            {formatDateTime(inquiry.createdAt)}
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-3">
          {inquiry.title}
        </h1>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {inquiry.body}
        </p>
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">投稿者: 匿名</p>
          <DeleteOwnPostButton
            ownerLineUserId={inquiry.lineUserId}
            endpoint={`/api/inquiries/${inquiry.id}`}
            confirmMessage="この投稿を削除しますか?"
            label="この投稿を削除"
          />
        </div>
      </article>

      {/* 回答 */}
      {inquiry.response ? (
        <article className="bg-green-50 rounded-xl p-5 shadow-sm border border-green-200">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-600 text-white font-medium">
              🏛️ 自治会からの回答
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              {formatDateTime(inquiry.response.respondedAt)}
            </span>
          </div>
          <p className="text-sm font-bold text-gray-800 mb-2">
            {inquiry.response.respondedBy}
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {inquiry.response.body}
          </p>
        </article>
      ) : (
        <div className="bg-gray-50 rounded-xl p-5 text-center border border-gray-200">
          <p className="text-sm text-gray-500">
            まだ回答はありません。しばらくお待ちください。
          </p>
        </div>
      )}
    </div>
  );
}
