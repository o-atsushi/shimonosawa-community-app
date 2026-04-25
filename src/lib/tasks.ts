import { client } from "@/lib/microcms";
import type { Task, TaskCms, TaskStatus } from "@/types";

function formatTask(c: TaskCms): Task {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    body: c.body,
    status: c.status?.[0] ?? "open",
    publishedAt: c.publishedAt ?? c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function getTasks(): Promise<Task[]> {
  if (!client) return [];
  try {
    const res = await client.getList<TaskCms>({
      endpoint: "tasks",
      queries: {
        orders: "-publishedAt",
        limit: 100,
      },
    });
    return res.contents.map(formatTask);
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

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "未着手",
  in_progress: "対応中",
  resolved: "解決済み",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-sky-100 text-sky-800",
  resolved: "bg-emerald-100 text-emerald-800",
};
