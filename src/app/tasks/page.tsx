import TaskCard from "@/components/TaskCard";
import { getTasks } from "@/lib/tasks";

export const revalidate = 60;

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">📋 自治会設立の課題</h1>
      <p className="text-xs text-gray-500 mb-4">
        新自治会設立に向けて取り組んでいる課題の一覧です。各課題にコメントで意見を寄せられます。
      </p>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ課題は登録されていません。
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
