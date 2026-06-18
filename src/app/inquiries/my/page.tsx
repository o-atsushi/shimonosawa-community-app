import MyInquiriesPage from "@/components/MyInquiriesPage";

// 投稿者本人専用: 自分が投稿した要望/質問の一覧。
// クライアント側で LIFF userId を取り /api/inquiries/mine から取得する。
export default function MyInquiriesRoute() {
  return <MyInquiriesPage />;
}
