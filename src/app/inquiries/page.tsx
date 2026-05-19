import Link from "next/link";
import InquiryCard from "@/components/InquiryCard";
import { getInquiries } from "@/lib/inquiries";
import { getLikeCounts } from "@/lib/inquiry-likes";

// いいね数を即時反映したいので revalidate を短めに保つ。
// (POST 側でも revalidatePath を呼んでいるので投稿者には即時反映)
export const revalidate = 60;

export default async function InquiriesPage() {
  const inquiries = await getInquiries();
  const likeCounts = await getLikeCounts(inquiries.map((i) => i.id));

  return (
    <div className="relative">
      <h1 className="text-xl font-bold text-gray-800 mb-2">💬 ご意見・要望</h1>
      <p className="text-xs text-gray-500 mb-4">
        自治会の運営・イベント・設備・アプリへの要望と、役員からの回答を掲載しています。
      </p>

      {inquiries.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ要望は投稿されていません。最初の投稿をしてみませんか？
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              likeCount={likeCounts[inquiry.id] ?? 0}
            />
          ))}
        </div>
      )}

      {/* フローティング投稿ボタン */}
      <Link
        href="/inquiries/new"
        className="fixed bottom-20 right-4 z-40 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg px-5 py-3 flex items-center gap-1 transition-colors"
      >
        <span className="text-xl leading-none">＋</span>
        <span className="text-sm">新規投稿</span>
      </Link>
    </div>
  );
}
