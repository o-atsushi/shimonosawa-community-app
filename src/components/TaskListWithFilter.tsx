"use client";

import { useMemo, useState } from "react";
import TaskCard from "@/components/TaskCard";
import type { Task, TaskPriority } from "@/types";

type StatusFilter = "all" | "undecided" | "decided";
type PriorityFilter = "all" | TaskPriority | "unset";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "undecided", label: "確定済み以外" },
  { value: "decided", label: "確定済み" },
];

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
  { value: "unset", label: "未設定" },
];

function matchesStatus(task: Task, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "decided") return task.status === "resolved";
  return task.status !== "resolved";
}

function matchesPriority(task: Task, filter: PriorityFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unset") return task.priority === undefined;
  return task.priority === filter;
}

export default function TaskListWithFilter({ tasks }: { tasks: Task[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (t) => matchesStatus(t, statusFilter) && matchesPriority(t, priorityFilter)
      ),
    [tasks, statusFilter, priorityFilter]
  );

  // 各フィルタの件数。もう一方の絞り込みを掛けた状態で数える方が直感的
  const statusCounts = useMemo(() => {
    const base = tasks.filter((t) => matchesPriority(t, priorityFilter));
    return {
      all: base.length,
      undecided: base.filter((t) => t.status !== "resolved").length,
      decided: base.filter((t) => t.status === "resolved").length,
    };
  }, [tasks, priorityFilter]);

  const priorityCounts = useMemo(() => {
    const base = tasks.filter((t) => matchesStatus(t, statusFilter));
    return {
      all: base.length,
      high: base.filter((t) => t.priority === "high").length,
      medium: base.filter((t) => t.priority === "medium").length,
      low: base.filter((t) => t.priority === "low").length,
      unset: base.filter((t) => t.priority === undefined).length,
    };
  }, [tasks, statusFilter]);

  return (
    <div>
      {/* 方針状況 */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1.5">方針状況で絞り込み</p>
        <div role="tablist" className="flex gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(f.value)}
                className={`flex-1 text-center text-sm py-2 rounded-lg border transition-colors ${
                  active
                    ? "bg-green-600 text-white border-green-600 font-bold"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f.label}
                <span
                  className={`ml-1 text-xs ${active ? "opacity-90" : "text-gray-400"}`}
                >
                  ({statusCounts[f.value]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 優先度 */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1.5">優先度で絞り込み</p>
        <div role="tablist" className="flex gap-1.5 flex-wrap">
          {PRIORITY_FILTERS.map((f) => {
            const active = priorityFilter === f.value;
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={active}
                onClick={() => setPriorityFilter(f.value)}
                className={`flex-1 min-w-[3.5rem] text-center text-xs py-1.5 rounded-lg border transition-colors ${
                  active
                    ? "bg-green-600 text-white border-green-600 font-bold"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f.label}
                <span
                  className={`ml-1 ${active ? "opacity-90" : "text-gray-400"}`}
                >
                  ({priorityCounts[f.value]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          該当する課題はありません。
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
