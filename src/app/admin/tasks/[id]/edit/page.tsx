import { notFound } from "next/navigation";
import Link from "next/link";
import AdminTaskForm from "@/components/AdminTaskForm";
import { getTask } from "@/lib/tasks";

export default async function EditAdminTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) return notFound();

  return (
    <div>
      <Link
        href="/admin/tasks"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 課題の管理に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">🛡️ 課題を編集</h1>
      <AdminTaskForm initial={task} />
    </div>
  );
}
