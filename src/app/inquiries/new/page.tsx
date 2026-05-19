import Link from "next/link";
import InquiryForm from "@/components/InquiryForm";

export default function NewInquiryPage() {
  return (
    <div>
      <Link
        href="/inquiries"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 要望一覧に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        📝 新しい要望を投稿する
      </h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-4">
        ℹ️ 投稿は役員が確認したのち公開されます。投稿直後はすぐに反映されません。
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <InquiryForm />
      </div>
    </div>
  );
}
