import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import TaskResolutionAdminControl from "@/components/TaskResolutionAdminControl";
import {
  RESOLUTION_OUTCOME_COLORS,
  RESOLUTION_OUTCOME_LABELS,
  getTask,
  hasResolution,
} from "@/lib/tasks";

// 投票後役員まとめページ。
// - 住民は結果と役員がまとめた要旨を見られる (未入力なら「まだ議決されていません」表示)
// - 役員には編集フォーム (TaskResolutionAdminControl) が上部に出る
export const revalidate = 30;

export default async function TaskResolutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) return notFound();
  const isResolved = hasResolution(task);

  return (
    <div>
      <Link
        href={`/tasks/${task.id}`}
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 課題に戻る
      </Link>

      <h1 className="text-lg font-bold text-gray-800 mb-1">
        🏛️ 投票後役員まとめ
      </h1>
      <p className="text-sm text-gray-700 mb-1">課題: {task.title}</p>
      {task.resolutionDate && (
        <p className="text-xs text-gray-500 mb-3">
          議決日: {task.resolutionDate}
        </p>
      )}

      {/* 役員専用 編集フォーム (非役員には表示されない) */}
      <TaskResolutionAdminControl task={task} />

      {/* 議決結果の表示 (住民にも見える) */}
      {isResolved ? (
        <article className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${RESOLUTION_OUTCOME_COLORS[task.resolutionOutcome]}`}
            >
              結果: {RESOLUTION_OUTCOME_LABELS[task.resolutionOutcome]}
            </span>
          </div>
          {task.resolutionSummary.trim().length > 0 ? (
            <ArticleBody html={task.resolutionSummary} />
          ) : (
            <p className="text-sm text-gray-500">
              まとめの本文はまだ入力されていません。
            </p>
          )}
        </article>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-gray-600 border border-gray-200">
          この課題はまだ議決されていません。
          <br />
          役員会で結論が出た後、こちらにまとめが掲載されます。
        </div>
      )}
    </div>
  );
}
