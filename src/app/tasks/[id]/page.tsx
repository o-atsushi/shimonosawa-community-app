import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import CommentForm from "@/components/CommentForm";
import CommentList from "@/components/CommentList";
import { getCommentsByTaskId } from "@/lib/comments";
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, getTask } from "@/lib/tasks";

export const revalidate = 30;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 課題本体とコメントを並列取得
  const [task, comments] = await Promise.all([
    getTask(id),
    getCommentsByTaskId(id),
  ]);

  if (!task) return notFound();

  return (
    <div>
      <Link
        href="/tasks"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 課題一覧に戻る
      </Link>

      <article className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[task.status]}`}
          >
            {TASK_STATUS_LABELS[task.status]}
          </span>
          <span className="text-xs text-gray-400 ml-auto">
            最終更新 {formatDateTime(task.updatedAt)}
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">{task.title}</h1>
        <p className="text-sm text-gray-600 mb-3">{task.summary}</p>
        <ArticleBody html={task.body} />
      </article>

      <section className="mb-6">
        <h2 className="text-base font-bold text-gray-800 mb-3">
          💬 コメント ({comments.length})
        </h2>
        <CommentList comments={comments} />
      </section>

      <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <CommentForm taskId={task.id} />
      </section>
    </div>
  );
}
