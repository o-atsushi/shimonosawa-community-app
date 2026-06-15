import AdminInquiryListPage from "@/components/AdminInquiryListPage";

// 役員専用: 要望/質問の公開設定ページ。
// 認可はクライアント側で /api/admin/inquiries 経由で is_admin チェックされる。
export default function AdminInquiriesPage() {
  return <AdminInquiryListPage />;
}
