import Link from "next/link";
import type { Task } from "@/types";
import {
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from "@/lib/tasks";

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

// body は HTML リッチテキストなのでタグを剥がしてプレーン化し、
// カードのプレビュー用にざっくり 120 文字までに切り詰める。
// 改行/連続スペースは半角空白 1 つに正規化する。
function bodyExcerpt(html: string, max = 120): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

export default function TaskCard({ task }: { task: Task }) {
  const excerpt = bodyExcerpt(task.body);
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
        {task.priority && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_PRIORITY_COLORS[task.priority]}`}
          >
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {formatDate(task.publishedAt)}
        </span>
      </div>
      <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1">
        {task.displayOrder !== undefined && (
          <span className="text-gray-400 font-normal mr-1.5">
            #{task.displayOrder}
          </span>
        )}
        {task.title}
      </h3>
      {excerpt && (
        <p className="text-xs text-gray-500 line-clamp-2">{excerpt}</p>
      )}
    </Link>
  );
}
