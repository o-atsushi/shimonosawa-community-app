"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, isLoggedIn } from "@/lib/liff";
import RichEditor from "@/components/RichEditor";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/tasks";
import type { TaskInput } from "@/lib/tasks";
import type { Task, TaskPriority, TaskStatus, VoteMode } from "@/types";

const TITLE_MAX = 100;

const STATUS_OPTIONS: TaskStatus[] = ["open", "in_progress", "resolved"];
const PRIORITY_OPTIONS: TaskPriority[] = ["high", "medium", "low"];
const VOTE_MODE_OPTIONS: { value: VoteMode; label: string }[] = [
  { value: "single", label: "単一選択 (ラジオ)" },
  { value: "multiple", label: "複数選択可 (チェックボックス)" },
  { value: "freetext", label: "自由回答 (テキスト)" },
];

// HTML 本文の空判定
function isHtmlEmpty(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}

// 新規作成 / 編集 共通のフォーム。
// initial を渡すと編集モード (PUT)、未指定なら新規作成 (POST)。
export default function AdminTaskForm({ initial }: { initial?: Task }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [authState, setAuthState] = useState<
    "loading" | "needs_login" | "forbidden" | "ready"
  >("loading");
  const [lineUserId, setLineUserId] = useState<string | undefined>();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "open");
  const [priority, setPriority] = useState<TaskPriority | "">(
    initial?.priority ?? ""
  );
  const [displayOrder, setDisplayOrder] = useState<string>(
    initial?.displayOrder !== undefined ? String(initial.displayOrder) : ""
  );
  // microCMS 側に保存される文字列は改行区切り。fronted 側では textarea で扱う。
  // initial に voteOptions (配列) しか無いので join で復元する。
  const [voteOptionsRaw, setVoteOptionsRaw] = useState<string>(
    initial?.voteOptions.join("\n") ?? ""
  );
  const [voteDeadline, setVoteDeadline] = useState<string>(
    initial?.voteDeadline ? initial.voteDeadline.split("T")[0] : ""
  );
  const [voteMode, setVoteMode] = useState<VoteMode>(initial?.voteMode ?? "single");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setAuthState("needs_login");
      return;
    }
    const p = getProfile();
    if (!p) {
      setAuthState("needs_login");
      return;
    }
    p.then(async (profile) => {
      const uid = profile?.userId;
      if (!uid) {
        setAuthState("needs_login");
        return;
      }
      setLineUserId(uid);
      try {
        const res = await fetch(
          `/api/members/me?lineUserId=${encodeURIComponent(uid)}`
        );
        if (!res.ok) {
          setAuthState("needs_login");
          return;
        }
        const data = await res.json();
        setAuthState(data.member?.isAdmin ? "ready" : "forbidden");
      } catch {
        setAuthState("needs_login");
      }
    }).catch(() => setAuthState("needs_login"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lineUserId) return;
    if (title.trim().length === 0) {
      setError("タイトルを入力してください");
      return;
    }
    if (title.length > TITLE_MAX) {
      setError(`タイトルは${TITLE_MAX}文字以内で入力してください`);
      return;
    }
    if (isHtmlEmpty(body)) {
      setError("本文を入力してください");
      return;
    }

    const payload: { input: TaskInput; lineUserId: string } = {
      lineUserId,
      input: {
        title: title.trim(),
        body,
        status,
        priority: priority || undefined,
        displayOrder:
          displayOrder.trim() === "" ? undefined : Number(displayOrder),
        voteOptionsRaw:
          voteOptionsRaw.trim().length > 0 ? voteOptionsRaw : undefined,
        voteDeadline: voteDeadline || undefined,
        voteMode,
      },
    };

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/admin/tasks/${initial!.id}`
        : "/api/admin/tasks";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      // 成功時: 編集→詳細ページに戻る / 新規→課題一覧に戻る
      router.push(isEdit ? `/tasks/${initial!.id}` : "/admin/tasks");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !lineUserId) return;
    if (
      !window.confirm(
        "この課題を削除しますか? 紐づく投票やコメントは Supabase 側に残ります。"
      )
    )
      return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tasks/${initial!.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "削除に失敗しました");
        return;
      }
      router.push("/admin/tasks");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (authState === "loading") {
    return <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>;
  }
  if (authState === "needs_login") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        LINE 経由でアプリを開いてください。
      </div>
    );
  }
  if (authState === "forbidden") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        このページは役員のみ利用できます。
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4"
    >
      <h2 className="text-base font-bold text-gray-800">
        {isEdit ? "課題を編集" : "課題を新規作成"}
      </h2>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          タイトル (必須)
          <span className="text-xs text-gray-400 font-normal ml-2">
            {title.length} / {TITLE_MAX}
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          required
          placeholder="例: 集会所の場所をどうするか"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          本文 (必須)
          <span className="text-gray-400 font-normal ml-2">
            画像 / 太字 / 見出し / リスト / リンクが使えます
          </span>
        </label>
        <RichEditor
          value={body}
          onChange={setBody}
          lineUserId={lineUserId}
          uploadEndpoint="/api/uploads/task-image"
          placeholder="背景・選択肢の解説など"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            ステータス
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            優先度 (任意)
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">未設定</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          表示順 (任意)
          <span className="text-gray-400 font-normal ml-2">
            小さいほど上に表示
          </span>
        </label>
        <input
          type="number"
          min={0}
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          placeholder="未設定の場合は公開日順"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="border border-gray-200 rounded-lg p-3 space-y-3">
        <legend className="text-xs font-bold text-gray-700 px-2">
          投票設定
        </legend>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            回答方式
          </label>
          <select
            value={voteMode}
            onChange={(e) => setVoteMode(e.target.value as VoteMode)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {VOTE_MODE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {voteMode !== "freetext" && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              投票選択肢 (改行区切り)
            </label>
            <textarea
              value={voteOptionsRaw}
              onChange={(e) => setVoteOptionsRaw(e.target.value)}
              rows={4}
              placeholder={"賛成\n反対\nどちらでもない"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              空欄なら投票機能は表示されません。「反対」を含む選択肢には自動で理由必須が適用されます (単一選択モードのみ)。
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            投票期限 (任意)
          </label>
          <input
            type="date"
            value={voteDeadline}
            onChange={(e) => setVoteDeadline(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2">
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm"
        >
          {submitting ? "保存中..." : isEdit ? "更新する" : "作成する"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            🗑 削除
          </button>
        )}
      </div>
    </form>
  );
}
