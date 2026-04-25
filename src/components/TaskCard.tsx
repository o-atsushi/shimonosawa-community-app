import Link from "next/link";
import type { Task } from "@/types";
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from "@/lib/tasks";

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

export default function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[task.status]}`}
        >
          {TASK_STATUS_LABELS[task.status]}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {formatDate(task.publishedAt)}
        </span>
      </div>
      <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1">
        {task.title}
      </h3>
      <p className="text-xs text-gray-500 line-clamp-2">{task.summary}</p>
    </Link>
  );
}
