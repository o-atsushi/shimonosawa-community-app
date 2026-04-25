// お知らせ記事の未読件数をクライアント側で管理するユーティリティ。
// サーバー側状態は持たず、localStorage に最終訪問時刻を保持するだけ。
// - 未読件数: ホームに表示する最新記事の publishedAt と比較
// - 既読化: /news を開いた瞬間に lastVisitedAt = now に更新

const STORAGE_KEY = "articles:lastVisitedAt";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getLastVisited(): Date | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function markVisited(): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}

// 渡された ISO 日付配列のうち、最終訪問時刻より新しいものをカウント
export function countUnread(publishedAtList: string[]): number {
  const last = getLastVisited();
  // 一度も開いたことがないユーザーは、未読件数=0 にしておく
  // (全件未読扱いにすると新規ユーザーに派手に数字が出てしまうため)
  if (!last) return 0;
  const lastTs = last.getTime();
  return publishedAtList.reduce((count, iso) => {
    const ts = new Date(iso).getTime();
    return Number.isNaN(ts) ? count : ts > lastTs ? count + 1 : count;
  }, 0);
}
