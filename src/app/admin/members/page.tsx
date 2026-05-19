import MembersAdminPage from "@/components/admin/MembersAdminPage";

// 役員のみアクセス可能な会員管理画面。
// クライアント側で LIFF userId → /api/admin/members で権限チェック。
// 詳細・編集は同コンポーネント内でモーダル展開。
export default function Page() {
  return <MembersAdminPage />;
}
