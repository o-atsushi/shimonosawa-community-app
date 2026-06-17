import Link from "next/link";
import AdminTaskForm from "@/components/AdminTaskForm";

export default function NewAdminTaskPage() {
  return (
    <div>
      <Link
        href="/admin/tasks"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 課題の管理に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        🛡️ 新しい課題を作成
      </h1>
      <AdminTaskForm />
    </div>
  );
}
