import { client } from "@/lib/microcms";
import type {
  ResolutionOutcome,
  Task,
  TaskCms,
  TaskContent,
  TaskPriority,
  TaskStatus,
  VoteMode,
} from "@/types";

const VALID_VOTE_MODES: VoteMode[] = ["single", "multiple", "freetext"];
const VALID_RESOLUTION_OUTCOMES: ResolutionOutcome[] = [
  "approved",
  "rejected",
  "deferred",
  "undecided",
];

// 改行区切りの投票選択肢を配列にパース。空白行と前後空白は除去。
function parseVoteOptions(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatTask(c: TaskCms): Task {
  const rawMode = c.voteMode?.[0];
  const voteMode: VoteMode =
    rawMode && VALID_VOTE_MODES.includes(rawMode) ? rawMode : "single";
  const rawOutcome = c.resolutionOutcome?.[0];
  const resolutionOutcome: ResolutionOutcome =
    rawOutcome && VALID_RESOLUTION_OUTCOMES.includes(rawOutcome)
      ? rawOutcome
      : "undecided";
  return {
    id: c.id,
    title: c.title,
    body: c.body,
    status: c.status?.[0] ?? "open",
    priority: c.priority?.[0],
    displayOrder: c.displayOrder,
    // freetext モードは選択肢を使わないので空配列扱い
    voteOptions:
      voteMode === "freetext" ? [] : parseVoteOptions(c.voteOptionsRaw),
    voteDeadline: c.voteDeadline,
    voteMode,
    resolutionOutcome,
    resolutionSummary: c.resolutionSummary ?? "",
    resolutionDate: c.resolutionDate,
    publishedAt: c.publishedAt ?? c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// 議決結果が「未入力」かどうか (未決 かつ サマリも空 かつ 日付も無い)
export function hasResolution(
  task: Pick<Task, "resolutionOutcome" | "resolutionSummary" | "resolutionDate">
): boolean {
  return (
    task.resolutionOutcome !== "undecided" ||
    task.resolutionSummary.trim().length > 0 ||
    !!task.resolutionDate
  );
}

// 投票機能が有効か。
// - single / multiple: voteOptions が 1 件以上
// - freetext: 常に有効 (選択肢不要)
export function hasVoting(task: Pick<Task, "voteMode" | "voteOptions">): boolean {
  if (task.voteMode === "freetext") return true;
  return task.voteOptions.length > 0;
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

// 議決結果ラベル / 色
export const RESOLUTION_OUTCOME_LABELS: Record<ResolutionOutcome, string> = {
  approved: "可決",
  rejected: "否決",
  deferred: "保留",
  undecided: "未決",
};

export const RESOLUTION_OUTCOME_COLORS: Record<ResolutionOutcome, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  deferred: "bg-yellow-100 text-yellow-800",
  undecided: "bg-gray-100 text-gray-600",
};

// ===== 役員向け: 課題の作成 / 更新 / 削除 =====
//
// microCMS への書き込み API キーが設定されている前提 (MICROCMS_API_KEY)。
// 認可 (役員チェック) は呼び出し側 (Route Handler) で行う。

// フォームから受け取る入力。フロントエンド側ではフラットな構造で扱い、
// microCMS のセレクトフィールドが要求する配列形式 ([status] 等) は
// ここで変換する。
export interface TaskInput {
  title: string;
  body: string; // sanitize 済み HTML
  status: TaskStatus;
  priority?: TaskPriority;
  displayOrder?: number;
  voteOptionsRaw?: string;
  voteDeadline?: string; // ISO date string
  voteMode?: VoteMode;
}

function inputToCmsContent(input: TaskInput): TaskContent {
  const content: TaskContent = {
    title: input.title,
    body: input.body,
    status: [input.status],
  };
  if (input.priority) content.priority = [input.priority];
  if (typeof input.displayOrder === "number")
    content.displayOrder = input.displayOrder;
  if (input.voteOptionsRaw) content.voteOptionsRaw = input.voteOptionsRaw;
  if (input.voteDeadline) content.voteDeadline = input.voteDeadline;
  if (input.voteMode) content.voteMode = [input.voteMode];
  return content;
}

export async function createTask(input: TaskInput): Promise<{ id: string }> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  return client.create<TaskContent>({
    endpoint: "tasks",
    content: inputToCmsContent(input),
  });
}

// 更新 (PATCH)。指定されたフィールドのみ上書きする。
// 投票選択肢を空にしたい場合などは空文字列を明示的に渡すこと。
export async function updateTaskContent(
  id: string,
  input: TaskInput
): Promise<void> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  await client.update<TaskContent>({
    endpoint: "tasks",
    contentId: id,
    content: inputToCmsContent(input),
  });
}

export async function deleteTaskById(id: string): Promise<void> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  await client.delete({
    endpoint: "tasks",
    contentId: id,
  });
}

// 議決結果 (3 フィールド) だけを更新する PATCH。
// 空文字を渡せばそのフィールドをクリアできる (microCMS 挙動に依存)。
export async function setTaskResolution(
  id: string,
  input: {
    resolutionOutcome: ResolutionOutcome;
    resolutionSummary: string;
    resolutionDate: string; // "" ならクリア
  }
): Promise<void> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  await client.update<
    Pick<
      TaskContent,
      "resolutionOutcome" | "resolutionSummary" | "resolutionDate"
    >
  >({
    endpoint: "tasks",
    contentId: id,
    content: {
      resolutionOutcome: [input.resolutionOutcome],
      resolutionSummary: input.resolutionSummary,
      resolutionDate: input.resolutionDate,
    },
  });
}
