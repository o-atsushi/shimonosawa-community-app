import { notFound } from "next/navigation";
import Link from "next/link";
import AdminTaskEditLink from "@/components/AdminTaskEditLink";
import AdminTaskResponsesLink from "@/components/AdminTaskResponsesLink";
import ArticleBody from "@/components/ArticleBody";
import CommentForm from "@/components/CommentForm";
import CommentList from "@/components/CommentList";
import VoteReasonsList from "@/components/VoteReasonsList";
import VotingPanel from "@/components/VotingPanel";
import { getCommentsByTaskId } from "@/lib/comments";
import { getLikeCounts as getCommentLikeCounts } from "@/lib/comment-likes";
import { getVoteReasons, getVoteSummary } from "@/lib/votes";
import {
  RESOLUTION_OUTCOME_COLORS,
  RESOLUTION_OUTCOME_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  getTask,
  hasResolution,
  hasVoting as hasVotingForTask,
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
  const hasVoting = hasVotingForTask(task);
  const isResolved = hasResolution(task);
  // freetext モードは個人回答なので住民側の理由一覧は出さない
  const showReasons =
    task.voteMode === "single" && voteReasons.length > 0;
  // コメントのいいね数を一括取得 (0 件時は空クエリでスキップ)
  const commentLikeCounts = await getCommentLikeCounts(
    comments.map((c) => c.id)
  );

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
        <ArticleBody html={task.body} />
        {/* 役員のみ「編集」リンクを表示 (投票機能の有無に依存しない) */}
        <div className="mt-3 text-right">
          <AdminTaskEditLink taskId={task.id} />
        </div>
      </article>

      {/* 議決結果へのリンク (常に表示。結果ページ側で「まだ議決されていません」を出す) */}
      <Link
        href={`/tasks/${task.id}/resolution`}
        className="block mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800">
            🏛️ 議決結果まとめ
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESOLUTION_OUTCOME_COLORS[task.resolutionOutcome]}`}
          >
            {RESOLUTION_OUTCOME_LABELS[task.resolutionOutcome]}
          </span>
          {task.resolutionDate && (
            <span className="text-xs text-gray-500">
              ({task.resolutionDate})
            </span>
          )}
          <span className="text-xs text-green-600 ml-auto">
            {isResolved ? "詳細を見る →" : "詳細ページを開く →"}
          </span>
        </div>
      </Link>

      {hasVoting && (
        <section className="mb-6">
          <VotingPanel
            taskId={task.id}
            voteMode={task.voteMode}
            voteOptions={task.voteOptions}
            voteDeadline={task.voteDeadline}
            summary={voteSummary}
          />
          {/* 役員のみ「回答一覧 (名前付き)」へのリンクを表示 */}
          <div className="mt-2 text-right">
            <AdminTaskResponsesLink taskId={task.id} />
          </div>
        </section>
      )}

      {showReasons && (
        <section className="mb-6">
          <VoteReasonsList reasons={voteReasons} />
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-base font-bold text-gray-800 mb-3">
          💬 コメント ({comments.length})
        </h2>
        <CommentList comments={comments} likeCounts={commentLikeCounts} />
      </section>

      <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <CommentForm taskId={task.id} />
      </section>
    </div>
  );
}
