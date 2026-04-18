import Link from "next/link";
import InquiryForm from "@/components/InquiryForm";

export default function NewInquiryPage() {
  return (
    <div>
      <Link
        href="/inquiries"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 掲示板に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        📝 新しい投稿をする
      </h1>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <InquiryForm />
      </div>
    </div>
  );
}
