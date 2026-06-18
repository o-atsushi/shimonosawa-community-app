import { notFound } from "next/navigation";
import Link from "next/link";
import OwnInquiryEditPage from "@/components/OwnInquiryEditPage";
import { getInquiry } from "@/lib/inquiries";

// 投稿者本人による編集ページ。
// 認可: クライアント側で LIFF userId と inquiry.lineUserId の一致 + 未公開を確認。
export default async function EditInquiryRoute({
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
        href={`/inquiries/${inquiry.id}`}
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 投稿に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        ✏️ 投稿を編集する
      </h1>
      <OwnInquiryEditPage inquiry={inquiry} />
    </div>
  );
}
