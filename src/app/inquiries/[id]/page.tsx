import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import DeleteOwnPostButton from "@/components/DeleteOwnPostButton";
import InquiryAdminPublishControl from "@/components/InquiryAdminPublishControl";
import InquiryLikeButton from "@/components/InquiryLikeButton";
import { getInquiry } from "@/lib/inquiries";
import { getLikeCount } from "@/lib/inquiry-likes";
import {
  INQUIRY_CATEGORY_COLORS,
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_KIND_COLORS,
  INQUIRY_KIND_LABELS,
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

  const likeCount = await getLikeCount(inquiry.id);

  return (
    <div>
      <Link
        href="/inquiries"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 要望一覧に戻る
      </Link>

      {/* 未公開時のバナー (誰でも表示) + 役員専用の公開トグル */}
      {!inquiry.isPublished && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-3">
          🔒 この投稿は現在 <b>未公開</b> です。役員が確認・公開するまで他の住民の一覧には表示されません。
        </div>
      )}
      <InquiryAdminPublishControl
        inquiryId={inquiry.id}
        isPublished={inquiry.isPublished}
      />

      {/* 投稿 */}
      <article className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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
            {formatDateTime(inquiry.createdAt)}
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-3">
          {inquiry.title}
        </h1>
        <ArticleBody html={inquiry.body} variant="untrusted" />
        <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">投稿者: 匿名</p>
            <InquiryLikeButton
              inquiryId={inquiry.id}
              initialCount={likeCount}
              size="md"
            />
          </div>
          <DeleteOwnPostButton
            ownerLineUserId={inquiry.lineUserId}
            endpoint={`/api/inquiries/${inquiry.id}`}
            redirectTo="/inquiries"
            confirmMessage="この投稿を削除しますか?"
            label="この投稿を削除"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          関心がある場合はハートを押してください。みんなの関心の高さの目安になります。
        </p>
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
