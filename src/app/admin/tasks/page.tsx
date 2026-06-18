import AdminTaskListPage from "@/components/AdminTaskListPage";
import { getTasks } from "@/lib/tasks";

// 役員専用: 課題管理ページ。
// 認可はクライアント側で /api/members/me 経由で is_admin チェックされる。
// 一覧データ自体は公開情報なので SSR で取得して初期表示に渡す。
export const revalidate = 30;

export default async function AdminTasksPage() {
  const tasks = await getTasks();
  return <AdminTaskListPage initialTasks={tasks} />;
}
