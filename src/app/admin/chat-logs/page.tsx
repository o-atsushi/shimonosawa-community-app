import AdminChatLogsPage from "@/components/AdminChatLogsPage";

// 役員専用: AI相談の質問ログ。認可は /api/admin/chat-logs で is_admin チェック。
export default function AdminChatLogs() {
  return <AdminChatLogsPage />;
}
