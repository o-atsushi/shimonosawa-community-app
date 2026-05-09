import { client } from "@/lib/microcms";
import type { Task, TaskCms, TaskPriority, TaskStatus } from "@/types";

// 改行区切りの投票選択肢を配列にパース。空白行と前後空白は除去。
function parseVoteOptions(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatTask(c: TaskCms): Task {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    body: c.body,
    status: c.status?.[0] ?? "open",
    priority: c.priority?.[0],
    displayOrder: c.displayOrder,
    voteOptions: parseVoteOptions(c.voteOptionsRaw),
    voteDeadline: c.voteDeadline,
    publishedAt: c.publishedAt ?? c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// 「反対」を含む選択肢かどうか。理由必須化の判定に使う。
// 役員が "反対" / "強く反対" など複数のラベルを使えるよう、文字列含有チェック。
export function requiresReason(option: string): boolean {
  return option.includes("反対");
}

// 投票期限が設定されていて、かつ過ぎているか
export function isVoteClosed(deadline: string | undefined, now: Date = new Date()): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  return now.getTime() > d.getTime();
}

// 表示順: displayOrder の昇順 (未設定は末尾)、同値なら publishedAt 降順
function compareTasks(a: Task, b: Task): number {
  const ao = a.displayOrder ?? Number.POSITIVE_INFINITY;
  const bo = b.displayOrder ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

export async function getTasks(): Promise<Task[]> {
  if (!client) return [];
  try {
    const res = await client.getList<TaskCms>({
      endpoint: "tasks",
      queries: {
        // displayOrder で並び替えるためサーバー側 orders は使わずクライアントで sort
        limit: 100,
      },
    });
    return res.contents.map(formatTask).sort(compareTasks);
  } catch (err) {
    // microCMS 側に tasks API がまだ無い場合 (404) もここに来る。
    // 空配列を返してビルドを失敗させない (役員が後でAPI作成する想定)。
    console.warn("[tasks] getTasks failed, returning empty list", err);
    return [];
  }
}

export async function getTask(id: string): Promise<Task | undefined> {
  if (!client) return undefined;
  try {
    const c = await client.get<TaskCms>({
      endpoint: "tasks",
      contentId: id,
    });
    return formatTask(c);
  } catch {
    return undefined;
  }
}

// 方針状況 (status)
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "未着手",
  in_progress: "検討中",
  resolved: "方針確定",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  open: "bg-gray-200 text-gray-700",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

// 優先度 (priority)
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "優先度: 高",
  medium: "優先度: 中",
  low: "優先度: 低",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-slate-100 text-slate-600",
};
