import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import CommentForm from "@/components/CommentForm";
import CommentList from "@/components/CommentList";
import VoteReasonsList from "@/components/VoteReasonsList";
import VotingPanel from "@/components/VotingPanel";
import { getCommentsByTaskId } from "@/lib/comments";
import { getVoteReasons, getVoteSummary } from "@/lib/votes";
import {
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  getTask,
} from "@/lib/tasks";

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
  // 課題本体・コメント・投票集計・投票理由を並列取得
  const [task, comments, voteSummary, voteReasons] = await Promise.all([
    getTask(id),
    getCommentsByTaskId(id),
    getVoteSummary(id),
    getVoteReasons(id),
  ]);

  if (!task) return notFound();
  const hasVoting = task.voteOptions.length > 0;

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
          {task.priority && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_PRIORITY_COLORS[task.priority]}`}
            >
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            最終更新 {formatDateTime(task.updatedAt)}
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">
          {task.displayOrder !== undefined && (
            <span className="text-gray-400 font-normal mr-1.5">
              #{task.displayOrder}
            </span>
          )}
          {task.title}
        </h1>
        <p className="text-sm text-gray-600 mb-3">{task.summary}</p>
        <ArticleBody html={task.body} />
      </article>

      {hasVoting && (
        <section className="mb-6">
          <VotingPanel
            taskId={task.id}
            voteOptions={task.voteOptions}
            voteDeadline={task.voteDeadline}
            summary={voteSummary}
          />
        </section>
      )}

      {hasVoting && voteReasons.length > 0 && (
        <section className="mb-6">
          <VoteReasonsList reasons={voteReasons} />
        </section>
      )}

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
