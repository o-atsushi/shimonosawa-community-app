import Link from "next/link";
import InquiryCard from "@/components/InquiryCard";
import { getInquiries } from "@/lib/inquiries";

export const revalidate = 60;

export default async function InquiriesPage() {
  const inquiries = await getInquiries();

  return (
    <div className="relative">
      <h1 className="text-xl font-bold text-gray-800 mb-2">💬 みんなの掲示板</h1>
      <p className="text-xs text-gray-500 mb-4">
        自治会員からの要望・質問と、自治会役員からの回答を掲載しています。
      </p>

      {inquiries.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ投稿はありません。最初の投稿をしてみませんか？
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
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
