import AdminChatLogsLink from "@/components/AdminChatLogsLink";
import ChatPage from "@/components/ChatPage";

export const metadata = { title: "AI相談 | 下ノ沢自治会" };

export default function Chat() {
  return (
    <div className="space-y-3">
      <AdminChatLogsLink />
      <ChatPage />
    </div>
  );
}
